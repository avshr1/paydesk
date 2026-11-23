import type Stripe from "stripe";
import { InvoiceStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// "paid": this event marked an invoice paid. "processed": a payment was
// recorded but the invoice didn't change (wrong amount, or already paid).
export type EventOutcome = "paid" | "processed" | "duplicate" | "ignored";

// Handles a webhook event whose signature has already been verified.
//
// Stripe delivers events "at least once", so the same event can arrive
// twice. Its ID is recorded in StripeEvent inside the same transaction that
// marks the invoice paid: a repeat finds the ID already there and changes
// nothing. See docs/decisions.md #3.
export async function handleStripeEvent(
  event: Stripe.Event,
): Promise<EventOutcome> {
  if (event.type !== "checkout.session.completed") return "ignored";

  const session = event.data.object;
  if (session.payment_status !== "paid") return "ignored";

  return db.$transaction(async (tx) => {
    const recorded = await tx.stripeEvent.createMany({
      data: { id: event.id, type: event.type },
      skipDuplicates: true,
    });
    if (recorded.count === 0) return "duplicate";

    const invoiceId = session.metadata?.invoiceId;
    const invoice = invoiceId
      ? await tx.invoice.findUnique({ where: { id: invoiceId } })
      : null;
    if (!invoice || session.amount_total === null) {
      console.error("Paid Checkout session has no matching invoice", {
        eventId: event.id,
        sessionId: session.id,
      });
      return "ignored";
    }

    const paymentIntent = session.payment_intent;
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amountCents: session.amount_total,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id,
      },
    });

    // Money moved either way, so the Payment is always recorded. The invoice
    // only becomes PAID if the charge matches its stored total exactly.
    const amountMatches =
      session.amount_total === invoice.totalCents &&
      session.currency === invoice.currency;
    if (!amountMatches) {
      console.error("Payment amount doesn't match invoice total", {
        invoiceId: invoice.id,
        paid: session.amount_total,
        expected: invoice.totalCents,
      });
      return "processed";
    }

    const marked = await tx.invoice.updateMany({
      where: {
        id: invoice.id,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
      },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(event.created * 1000),
      },
    });
    return marked.count === 1 ? "paid" : "processed";
  });
}
