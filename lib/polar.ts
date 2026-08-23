import "server-only";
import { Polar } from "@polar-sh/sdk";

/**
 * Which Polar to talk to. Sandbox unless the environment says production, so
 * going live is a variable change rather than a code change — a build that
 * ships the wrong constant either takes real money into a test ledger or
 * silently refuses live cards.
 */
export const POLAR_SERVER =
  process.env.POLAR_SERVER === "production" ? "production" : "sandbox";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: POLAR_SERVER,
});

/**
 * Product IDs created in the Polar dashboard.
 * Each maps to a pricing tier shown on the paywall.
 */
export const POLAR_PRODUCTS = {
  trial: process.env.POLAR_PRODUCT_TRIAL!,
  monthly: process.env.POLAR_PRODUCT_MONTHLY!,
  yearly: process.env.POLAR_PRODUCT_YEARLY!,
  yearlyExit: process.env.POLAR_PRODUCT_YEARLY_EXIT!,
} as const;

export type PolarPlan = keyof typeof POLAR_PRODUCTS;

/** What we store against the user. The two yearly products are one plan. */
export type StoredPlan = "trial" | "monthly" | "yearly";

/**
 * Which of our plans a Polar payment belongs to.
 *
 * Product id first, because that is the one thing Polar always sends and we
 * always know. The checkout metadata is second: it is our own value, so it is
 * right whenever it is present, but it is absent on anything created outside
 * this app. The billing interval is the last resort.
 */
export function resolvePlan(
  productId?: string | null,
  recurringInterval?: string | null,
  metadataPlan?: unknown,
): StoredPlan {
  if (productId) {
    if (productId === POLAR_PRODUCTS.trial) return "trial";
    if (productId === POLAR_PRODUCTS.monthly) return "monthly";
    if (productId === POLAR_PRODUCTS.yearly) return "yearly";
    if (productId === POLAR_PRODUCTS.yearlyExit) return "yearly";
  }
  if (metadataPlan === "trial") return "trial";
  if (metadataPlan === "monthly") return "monthly";
  if (metadataPlan === "yearly" || metadataPlan === "yearlyExit") return "yearly";
  return recurringInterval === "year" ? "yearly" : "monthly";
}

/**
 * Dates have to reach Firestore as ISO strings.
 *
 * The SDK hands back real `Date` objects, and a `Date` written through the
 * Admin SDK is stored as a Timestamp. The browser then reads back
 * `{seconds, nanoseconds}`, `new Date()` on it is Invalid, and the expiry
 * check turns a paid-up subscriber into a locked-out one.
 */
export function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}
