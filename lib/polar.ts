import "server-only";
import { Polar } from "@polar-sh/sdk";

/**
 * Polar SDK client configured for sandbox (test) mode.
 * Switch `server` to `"production"` when going live.
 */
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: "sandbox",
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
