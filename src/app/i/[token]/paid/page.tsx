import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicInvoice } from "@/lib/invoices";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

// Where Stripe sends the client after paying. The webhook, not this page,
// marks the invoice paid, and it can arrive a few seconds later.
export default async function PaymentSuccessPage({
  params,
}: PageProps<"/i/[token]/paid">) {
  const { token } = await params;

  const invoice = await getPublicInvoice(token);
  if (!invoice) notFound();

  const confirmed = invoice.status === "PAID";
  const sender = invoice.user.name ?? invoice.user.email;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">
        {confirmed ? "Payment received" : "Payment processing"}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {confirmed
          ? `Thank you! Your payment of ${formatCents(invoice.totalCents, invoice.currency)} to ${sender} for invoice ${invoice.number} is confirmed.`
          : `Thank you! Stripe is confirming your payment for invoice ${invoice.number}. This usually takes a few seconds; refresh this page to check.`}
      </p>
      <Link href={`/i/${token}`} className="mt-2 text-sm font-medium underline">
        View invoice
      </Link>
    </main>
  );
}
