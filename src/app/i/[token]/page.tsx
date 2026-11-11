import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/dates";
import { getPublicInvoice } from "@/lib/invoices";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = {
  title: "Invoice",
  // Anyone with the link can view it, but it should never show up in search.
  robots: { index: false, follow: false },
};

export default async function PublicInvoicePage({
  params,
}: PageProps<"/i/[token]">) {
  const { token } = await params;

  const invoice = await getPublicInvoice(token);
  if (!invoice) notFound();

  const sender = invoice.user.name ?? invoice.user.email;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Invoice from {sender}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold">
              {invoice.number}
            </h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Issued {formatDate(invoice.issueDate)} · Due{" "}
            {formatDate(invoice.dueDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {invoice.status === "PAID" ? "Paid" : "Amount due"}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatCents(invoice.totalCents, invoice.currency)}
          </p>
          <a
            href={`/i/${token}/pdf`}
            download
            className="mt-2 inline-block text-sm font-medium underline"
          >
            Download PDF
          </a>
        </div>
      </div>

      <InvoiceDocument invoice={invoice} from={invoice.user} />

      <footer className="border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        Sent with Paydesk. Payments run in Stripe test mode.
      </footer>
    </main>
  );
}
