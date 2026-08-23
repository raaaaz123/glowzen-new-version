import "server-only";
import { collections } from "@/lib/firebase/collections";
import { toIsoDate, type StoredPlan } from "@/lib/polar";

/**
 * Subscription state as the app reads it. Same shape as `SubscriptionState`
 * in GlowContext — this is the server's half of that contract.
 */
export interface StoredSubscription {
  active: boolean;
  plan: StoredPlan | null;
  /** ISO string or null. Null means "no known end", not "expired". */
  expiresAt: string | null;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
}

/**
 * Writes the subscription onto the user document with the Admin SDK, which
 * bypasses the client security rules. Every caller has already established
 * that the payment is real — a verified webhook signature, or a checkout
 * fetched from Polar by id.
 */
export async function writeSubscription(
  uid: string,
  subscription: StoredSubscription,
): Promise<void> {
  const { getAdminDb } = await import("@/lib/server/firebaseAdmin");
  await getAdminDb()
    .doc(`${collections.users}/${uid}`)
    .set(
      { subscription, updatedAt: new Date().toISOString() },
      { merge: true },
    );
}

/**
 * Polar's subscription statuses, reduced to the one question the app asks.
 * `trialing` counts: the customer is inside a paid trial, not outside it.
 */
export function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/** Shape of the subscription fields we read off a webhook payload. */
interface SubscriptionLike {
  id?: string | null;
  status?: string | null;
  customerId?: string | null;
  currentPeriodEnd?: unknown;
  endsAt?: unknown;
  recurringInterval?: string | null;
  productId?: string | null;
  product?: { id?: string | null; recurringInterval?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Builds what we store from a Polar subscription object.
 *
 * `active` is passed in rather than read off the status, because two events
 * disagree with it on purpose: a cancellation that takes effect at the end of
 * the period leaves the customer paid up until then.
 */
export function subscriptionFrom(
  sub: SubscriptionLike,
  plan: StoredPlan | null,
  active: boolean,
): StoredSubscription {
  return {
    active,
    plan: active ? plan : null,
    expiresAt: toIsoDate(sub.currentPeriodEnd) ?? toIsoDate(sub.endsAt),
    polarCustomerId: sub.customerId ?? null,
    polarSubscriptionId: sub.id ?? null,
  };
}

/**
 * Where the Firebase uid can be hiding.
 *
 * We set it on the checkout, and Polar copies checkout metadata onto the
 * order and the subscription — but not uniformly across every event, so each
 * handler looks in all the places rather than trusting one.
 */
export function findUid(...sources: unknown[]): string | null {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const uid = (source as Record<string, unknown>).firebaseUid;
    if (typeof uid === "string" && uid) return uid;
  }
  return null;
}
