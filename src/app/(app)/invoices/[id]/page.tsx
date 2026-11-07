import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/confirm-button";
import { InvoiceDocument } from "@/components/invoice-document";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/dates";
import { isEditable } from "@/lib/invoice-status";
import { getInvoice } from "@/lib/invoices";
import { requireUserId } from "@/lib/session";
import { deleteInvoice, sendInvoice } from "../actions";
import { SendInvoiceForm } from "./send-invoice-form";

export const metadata: Metadata = { title: "Invoice · Paydesk" };

export default async function InvoicePage({
  params,
}: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();

  const invoice = await getInvoice(userId, id);
  if (!invoice) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
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
        {isEditable(invoice.status) && (
          <div className="flex flex-wrap items-start gap-3">
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Edit draft
            </Link>
            <SendInvoiceForm
              action={sendInvoice.bind(null, invoice.id)}
              clientEmail={invoice.client.email}
            />
          </div>
        )}
      </div>

      <InvoiceDocument
        invoice={invoice}
        clientHref={`/clients/${invoice.client.id}`}
      />

      {isEditable(invoice.status) && (
        <form action={deleteInvoice.bind(null, invoice.id)}>
          <ConfirmButton
            confirmMessage={`Delete draft ${invoice.number}? This can't be undone.`}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Delete draft
          </ConfirmButton>
        </form>
      )}

      <Link
        href="/invoices"
        className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Back to invoices
      </Link>
    </div>
  );
}
