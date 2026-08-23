import { type NextRequest, NextResponse } from "next/server";
import { polar, POLAR_PRODUCTS, type PolarPlan } from "@/lib/polar";

/**
 * POST /api/checkout
 *
 * Creates a Polar checkout session and returns the redirect URL.
 * The client sends the plan key ("trial" | "monthly" | "yearly" | "yearlyExit")
 * and the Firebase uid as metadata so the webhook can write back.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { plan: PolarPlan; uid: string; email?: string };
    const { plan, uid, email } = body;

    const productId = POLAR_PRODUCTS[plan];
    if (!productId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;

    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${origin}/results?subscribed=1`,
      customerEmail: email || undefined,
      metadata: {
        firebaseUid: uid,
        plan,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[checkout] Failed to create session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
