import { type NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@polar-sh/nextjs";

// Firebase Admin for server-side writes (bypasses client security rules)
// import { getAdminDb } from "@/lib/server/firebaseAdmin";

/**
 * POST /api/webhook/polar
 *
 * Handles Polar subscription lifecycle events:
 * - subscription.created  → activate subscription in Firestore
 * - subscription.updated  → update plan/status
 * - subscription.canceled → mark expired
 * - order.created         → log for analytics
 *
 * The webhook verifies the Polar signature before processing. The Firebase
 * uid is passed as metadata.firebaseUid from the checkout session.
 */

const COLLECTION = "glowzen_web_users";

/**
 * Map Polar's recurring_interval to our plan names.
 * Trial is identified by the product ID match.
 */
function resolvePlan(
  recurringInterval: string | null | undefined,
  productId: string | null | undefined,
): "trial" | "monthly" | "yearly" {
  const trialId = process.env.POLAR_PRODUCT_TRIAL;
  if (productId && trialId && productId === trialId) return "trial";
  if (recurringInterval === "year") return "yearly";
  return "monthly";
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,
  onPayload: async (payload) => {
    // Dynamic import to avoid loading admin SDK on every cold start
    const { getAdminDb } = await import("@/lib/server/firebaseAdmin");
    const db = getAdminDb();

    switch (payload.type) {
      /* ── subscription created ────────────────────────────────────────── */
      case "subscription.created": {
        const sub = payload.data;
        const uid = (sub.metadata as Record<string, string>)?.firebaseUid;
        if (!uid) {
          console.warn("[webhook] subscription.created missing firebaseUid in metadata");
          return;
        }

        const plan = resolvePlan(
          sub.recurringInterval,
          sub.product?.id,
        );

        await db.doc(`${COLLECTION}/${uid}`).set(
          {
            subscription: {
              active: true,
              plan,
              expiresAt: sub.currentPeriodEnd ?? null,
              polarCustomerId: sub.customerId ?? null,
              polarSubscriptionId: sub.id,
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        console.log(`[webhook] subscription.created → ${uid} (${plan})`);
        break;
      }

      /* ── subscription updated (renewal, plan change) ────────────────── */
      case "subscription.updated": {
        const sub = payload.data;
        const uid = (sub.metadata as Record<string, string>)?.firebaseUid;
        if (!uid) {
          console.warn("[webhook] subscription.updated missing firebaseUid");
          return;
        }

        const isActive = sub.status === "active";
        const plan = resolvePlan(
          sub.recurringInterval,
          sub.product?.id,
        );

        await db.doc(`${COLLECTION}/${uid}`).set(
          {
            subscription: {
              active: isActive,
              plan,
              expiresAt: sub.currentPeriodEnd ?? null,
              polarCustomerId: sub.customerId ?? null,
              polarSubscriptionId: sub.id,
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        console.log(`[webhook] subscription.updated → ${uid} (${plan}, active=${isActive})`);
        break;
      }

      /* ── subscription canceled ──────────────────────────────────────── */
      case "subscription.canceled": {
        const sub = payload.data;
        const uid = (sub.metadata as Record<string, string>)?.firebaseUid;
        if (!uid) {
          console.warn("[webhook] subscription.canceled missing firebaseUid");
          return;
        }

        // Keep access until the current billing period ends
        await db.doc(`${COLLECTION}/${uid}`).set(
          {
            subscription: {
              active: false,
              plan: null,
              expiresAt: sub.currentPeriodEnd ?? new Date().toISOString(),
              polarCustomerId: sub.customerId ?? null,
              polarSubscriptionId: sub.id,
            },
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        console.log(`[webhook] subscription.canceled → ${uid}`);
        break;
      }

      /* ── order created (analytics) ──────────────────────────────────── */
      case "order.created": {
        const order = payload.data;
        const uid = (order.metadata as Record<string, string>)?.firebaseUid;
        console.log(
          `[webhook] order.created → uid=${uid ?? "unknown"} amount=${order.totalAmount} currency=${order.currency}`,
        );
        break;
      }

      default:
        console.log(`[webhook] unhandled event: ${payload.type}`);
    }
  },
});
