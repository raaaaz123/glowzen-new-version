import { Webhooks } from "@polar-sh/nextjs";
import { resolvePlan } from "@/lib/polar";
import {
  findUid,
  isActiveStatus,
  subscriptionFrom,
  writeSubscription,
} from "@/lib/server/subscriptions";

/**
 * POST /api/webhook/polar
 *
 * Polar's subscription lifecycle, written through to Firestore. The signature
 * is verified by `Webhooks()` before any of this runs; the Firebase uid rides
 * along in the checkout metadata.
 *
 * ⚠️  The URL registered in Polar must be exactly
 *     https://www.glowzen.app/api/webhook/polar
 *     A second slash after the host makes Next.js answer 308 Redirect, and a
 *     webhook POST does not follow redirects — every delivery fails.
 *
 * Every branch writes the whole subscription object, so events arriving out
 * of order settle on the same state either way.
 */
const handler = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    switch (payload.type) {
      /* ── subscription: created, activated, renewed, changed ─────────── */
      case "subscription.created":
      case "subscription.active":
      case "subscription.updated":
      case "subscription.uncanceled": {
        const sub = payload.data;
        const uid = findUid(sub.metadata, sub.customer?.metadata);
        if (!uid) {
          console.warn(`[webhook] ${payload.type}: no firebaseUid in metadata`);
          return;
        }

        // A cancellation scheduled for the end of the period is still a paid
        // subscription today; `currentPeriodEnd` is what closes it.
        const active = isActiveStatus(sub.status);
        const plan = resolvePlan(
          sub.productId ?? sub.product?.id,
          sub.recurringInterval,
          sub.metadata?.plan,
        );

        await writeSubscription(uid, subscriptionFrom(sub, plan, active));
        console.log(
          `[webhook] ${payload.type} → ${uid} (${plan}, status=${sub.status})`,
        );
        break;
      }

      /* ── cancellation requested: access runs to the end of the period ── */
      case "subscription.canceled": {
        const sub = payload.data;
        const uid = findUid(sub.metadata, sub.customer?.metadata);
        if (!uid) return;

        const plan = resolvePlan(
          sub.productId ?? sub.product?.id,
          sub.recurringInterval,
          sub.metadata?.plan,
        );
        await writeSubscription(
          uid,
          subscriptionFrom(sub, plan, isActiveStatus(sub.status)),
        );
        console.log(`[webhook] subscription.canceled → ${uid} (ends at period end)`);
        break;
      }

      /* ── access actually ends ───────────────────────────────────────── */
      case "subscription.revoked": {
        const sub = payload.data;
        const uid = findUid(sub.metadata, sub.customer?.metadata);
        if (!uid) return;

        await writeSubscription(uid, {
          active: false,
          plan: null,
          expiresAt: new Date().toISOString(),
          polarCustomerId: sub.customerId ?? null,
          polarSubscriptionId: sub.id ?? null,
        });
        console.log(`[webhook] subscription.revoked → ${uid}`);
        break;
      }

      /* ── payment taken ──────────────────────────────────────────────
         Belt and braces: the order carries the subscription inline, so a
         missed or out-of-order subscription event still unlocks the app. */
      case "order.created":
      case "order.paid":
      case "order.updated": {
        const order = payload.data;
        const sub = order.subscription;
        const uid = findUid(order.metadata, sub?.metadata, order.customer?.metadata);
        if (!uid || !sub || !order.paid) {
          console.log(
            `[webhook] ${payload.type}: uid=${uid ?? "unknown"} paid=${order.paid}`,
          );
          return;
        }

        const plan = resolvePlan(
          order.productId ?? sub.productId,
          order.product?.recurringInterval ?? sub.recurringInterval,
          order.metadata?.plan ?? sub.metadata?.plan,
        );
        await writeSubscription(
          uid,
          subscriptionFrom(sub, plan, isActiveStatus(sub.status)),
        );
        console.log(`[webhook] ${payload.type} → ${uid} (${plan})`);
        break;
      }

      default:
        console.log(`[webhook] unhandled event: ${payload.type}`);
    }
  },
});

export const POST = async (req: Request) => {
  try {
    return await handler(req);
  } catch (error) {
    console.error("[webhook] FATAL ERROR:", error);
    throw error;
  }
};
