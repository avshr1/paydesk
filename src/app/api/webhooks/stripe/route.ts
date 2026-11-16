import Stripe from "stripe";
import { env } from "@/lib/env";
import { handleStripeEvent } from "@/lib/payments";

// Only used to verify signatures, which needs no API key.
const webhooks = Stripe.webhooks;

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return Response.json(
      { error: "Stripe webhooks are not configured." },
      { status: 503 },
    );
  }

  // The signature covers the exact bytes Stripe sent, so read the raw body.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing Stripe-Signature header");
    event = webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    // Never touch the database for a request that isn't provably from Stripe.
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Any error here returns 500, and Stripe retries the event later.
  const outcome = await handleStripeEvent(event);
  return Response.json({ received: true, outcome });
}
