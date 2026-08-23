import { NextResponse } from "next/server";
import { polar, resolvePlan, toIsoDate } from "@/lib/polar";
import { AuthError, requireUser } from "@/lib/server/auth";
import {
  isActiveStatus,
  writeSubscription,
  type StoredSubscription,
} from "@/lib/server/subscriptions";

/**
 * POST /api/checkout/confirm  { checkoutId }
 *
 * Turns "the customer came back from Polar" into "the customer has paid",
 * without waiting on the webhook.
 *
 * The webhook is the durable path — it is what keeps renewals and
 * cancellations right — but it is also the path that fails quietly: a wrong
 * URL, a retry window, a cold start. This asks Polar directly about the one
 * checkout the browser just came back from, so the unlock does not depend on
 * a delivery we cannot see from here.
 *
 * The uid comes from a verified Firebase token, never from the request body,
 * and it has to match the uid we put on the checkout when we created it —
 * otherwise anyone could quote someone else's checkout id.
 */
export async function POST(req: Request) {
  let uid: string;
  try {
    ({ uid } = await requireUser(req));
  } catch (error) {
    const message = error instanceof AuthError ? error.message : "Unauthorized";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  let checkoutId: string;
  try {
    const body = (await req.json()) as { checkoutId?: unknown };
    checkoutId = typeof body.checkoutId === "string" ? body.checkoutId : "";
  } catch {
    checkoutId = "";
  }
  if (!checkoutId) {
    return NextResponse.json({ error: "Missing checkoutId" }, { status: 400 });
  }

  try {
    const checkout = await polar.checkouts.get({ id: checkoutId });

    // `confirmed` means the customer has paid and Polar is settling it.
    // Waiting for `succeeded` here would leave a paying customer staring at
    // the paywall; if it later fails, the revoked webhook takes it back.
    if (checkout.status !== "succeeded" && checkout.status !== "confirmed") {
      return NextResponse.json(
        { error: "Checkout is not paid", status: checkout.status },
        { status: 409 },
      );
    }

    if (checkout.metadata?.firebaseUid !== uid) {
      console.warn(`[confirm] checkout ${checkoutId} does not belong to ${uid}`);
      return NextResponse.json({ error: "Not your checkout" }, { status: 403 });
    }

    // The period end lives on the subscription, not the checkout. Missing it
    // is not fatal: a null expiry reads as "no known end", not "expired".
    let expiresAt: string | null = null;
    let active = true;
    if (checkout.subscriptionId) {
      try {
        const sub = await polar.subscriptions.get({ id: checkout.subscriptionId });
        expiresAt = toIsoDate(sub.currentPeriodEnd);
        active = isActiveStatus(sub.status);
      } catch (error) {
        console.warn("[confirm] could not read subscription:", error);
      }
    }

    const subscription: StoredSubscription = {
      active,
      plan: active
        ? resolvePlan(
            checkout.productId,
            checkout.product?.recurringInterval,
            checkout.metadata?.plan,
          )
        : null,
      expiresAt,
      polarCustomerId: checkout.customerId ?? null,
      polarSubscriptionId: checkout.subscriptionId ?? null,
    };

    // Best effort. If the Admin SDK is not configured the browser still gets
    // the verified answer and unlocks for this session; the webhook is what
    // makes it stick, and it writes the same object.
    try {
      await writeSubscription(uid, subscription);
    } catch (error) {
      console.error("[confirm] Firestore write failed:", error);
    }

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error("[confirm] Polar lookup failed:", error);
    return NextResponse.json({ error: "Could not verify checkout" }, { status: 502 });
  }
}
