import { after } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { sendPaymentEmails } from "@/lib/payment-emails";
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

  // Only the event that actually marked the invoice paid sends emails, so a
  // repeated event never sends them twice. They go out after the response,
  // so Stripe gets its answer immediately.
  if (outcome === "paid" && event.type === "checkout.session.completed") {
    const invoiceId = event.data.object.metadata?.invoiceId;
    if (invoiceId) {
      after(() =>
        sendPaymentEmails(invoiceId).catch((error: unknown) =>
          console.error(`Payment emails for ${invoiceId} failed`, error),
        ),
      );
    }
  }

  return Response.json({ received: true, outcome });
}
