import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/dates";
import { isEditable } from "@/lib/invoice-status";
import { getInvoice } from "@/lib/invoices";
import { formatCents } from "@/lib/money";
import { requireUserId } from "@/lib/session";

export const metadata: Metadata = { title: "Invoice · Paydesk" };

function formatQuantity(hundredths: number) {
  return (hundredths / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function formatTaxRate(bps: number) {
  return `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

export default async function InvoicePage({
  params,
}: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();

  const invoice = await getInvoice(userId, id);
  if (!invoice) notFound();

  const money = (cents: number) => formatCents(cents, invoice.currency);

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
          <Link
            href={`/invoices/${invoice.id}/edit`}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Edit draft
          </Link>
        )}
      </div>

      <section
        aria-labelledby="bill-to"
        className="flex flex-col gap-1 text-sm"
      >
        <h2
          id="bill-to"
          className="text-xs font-medium text-zinc-500 uppercase"
        >
          Bill to
        </h2>
        <Link
          href={`/clients/${invoice.client.id}`}
          className="font-medium hover:underline"
        >
          {invoice.client.name}
        </Link>
        {invoice.client.company && <p>{invoice.client.company}</p>}
        <p className="text-zinc-600 dark:text-zinc-400">
          {invoice.client.email}
        </p>
        {invoice.client.address && (
          <p className="whitespace-pre-line text-zinc-600 dark:text-zinc-400">
            {invoice.client.address}
          </p>
        )}
      </section>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 text-right font-medium">Qty</th>
              <th className="py-2 pr-4 text-right font-medium">Unit price</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item) => (
              <tr
                key={item.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-3 pr-4">{item.description}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {formatQuantity(item.quantityHundredths)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {money(item.unitPriceCents)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {money(item.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm">
        <dt className="text-zinc-600 dark:text-zinc-400">Subtotal</dt>
        <dd className="text-right tabular-nums">
          {money(invoice.subtotalCents)}
        </dd>
        <dt className="text-zinc-600 dark:text-zinc-400">
          Tax ({formatTaxRate(invoice.taxRateBps)})
        </dt>
        <dd className="text-right tabular-nums">{money(invoice.taxCents)}</dd>
        <dt className="border-t border-zinc-200 pt-2 font-medium dark:border-zinc-800">
          Total
        </dt>
        <dd className="border-t border-zinc-200 pt-2 text-right font-semibold tabular-nums dark:border-zinc-800">
          {money(invoice.totalCents)}
        </dd>
      </dl>

      {invoice.notes && (
        <section
          aria-labelledby="notes"
          className="flex flex-col gap-1 text-sm"
        >
          <h2
            id="notes"
            className="text-xs font-medium text-zinc-500 uppercase"
          >
            Notes
          </h2>
          <p className="whitespace-pre-line">{invoice.notes}</p>
        </section>
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
