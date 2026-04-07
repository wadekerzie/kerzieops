import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { processSilverMoonStripeEvent } from "@/lib/silver-moon";
import { getSilverMoonStripeAccountId, getStripeClient } from "@/lib/stripe";

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  if (!stripeWebhookSecret) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Stripe webhook secret is not configured yet. The route is scaffolded and ready for live credentials."
      },
      { status: 503 }
    );
  }

  if (!signature) {
    return NextResponse.json({ ok: false, message: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = getStripeClient();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
    const silverMoonAccountId = getSilverMoonStripeAccountId();

    if (event.account && event.account !== silverMoonAccountId) {
      return NextResponse.json(
        {
          ok: false,
          message: `Webhook account ${event.account} does not match STRIPE_SILVER_MOON_ACCOUNT_ID.`
        },
        { status: 400 }
      );
    }

    const result = await processSilverMoonStripeEvent(event);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/proforma");
    revalidatePath("/dashboard/silver-moon");

    return NextResponse.json({
      ok: true,
      type: event.type,
      receivedForAccount: event.account ?? silverMoonAccountId,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Webhook processing failed."
      },
      { status: 400 }
    );
  }
}
