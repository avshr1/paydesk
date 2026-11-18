import { InvoiceStatus } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { getPublicInvoice } from "@/lib/invoices";
import { stripe } from "@/lib/stripe";

export type CheckoutResult =
  | { status: "redirect"; url: string }
  | { status: "not_found" }
  | { status: "error"; error: string };

// Starts a Stripe Checkout payment for the invoice behind a public token.
// The amount always comes from the invoice stored on the server, never
// from the browser (decisions.md #2).
export async function createCheckoutForToken(
  token: string,
): Promise<CheckoutResult> {
  const invoice = await getPublicInvoice(token);
  if (!invoice) return { status: "not_found" };

  if (invoice.status === InvoiceStatus.PAID) {
    return { status: "error", error: "This invoice has already been paid." };
  }
  if (!stripe) {
    return {
      status: "error",
      error: "Online payments aren't set up yet. Contact the sender to pay.",
    };
  }

  const invoiceUrl = new URL(`/i/${token}`, env.APP_URL).toString();
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: invoice.currency,
            unit_amount: invoice.totalCents,
            product_data: {
              name: `Invoice ${invoice.number}`,
              description: `From ${invoice.user.name ?? invoice.user.email}`,
            },
          },
        },
      ],
      customer_email: invoice.client.email,
      client_reference_id: invoice.id,
      // The webhook reads this to find the invoice to mark paid.
      metadata: { invoiceId: invoice.id },
      success_url: `${invoiceUrl}/paid`,
      cancel_url: `${invoiceUrl}?payment=cancelled`,
    });

    if (!session.url) throw new Error("Checkout session has no URL");
    return { status: "redirect", url: session.url };
  } catch (error) {
    console.error("Couldn't start Stripe Checkout", error);
    return {
      status: "error",
      error: "Couldn't start the payment. Please try again in a moment.",
    };
  }
}
