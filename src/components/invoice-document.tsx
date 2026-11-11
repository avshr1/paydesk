import Link from "next/link";
import type { Client, Invoice, LineItem } from "@/generated/prisma/client";
import { formatQuantity, formatTaxRate } from "@/lib/invoice-format";
import { formatCents } from "@/lib/money";

type InvoiceDocumentProps = {
  invoice: Invoice & { client: Client; lineItems: LineItem[] };
  // Who the invoice is from; shown on the client-facing page.
  from?: { name: string | null; email: string };
  // Where the client's name links to; omitted on the public page.
  clientHref?: string;
};

// The body of an invoice, shared by the freelancer's page and the public page
// so both always show the same thing.
export function InvoiceDocument({
  invoice,
  from,
  clientHref,
}: InvoiceDocumentProps) {
  const money = (cents: number) => formatCents(cents, invoice.currency);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        {from && (
          <section
            aria-labelledby="from"
            className="flex flex-col gap-1 text-sm"
          >
            <h2
              id="from"
              className="text-xs font-medium text-zinc-500 uppercase"
            >
              From
            </h2>
            {from.name && <p className="font-medium">{from.name}</p>}
            <p className="text-zinc-600 dark:text-zinc-400">{from.email}</p>
          </section>
        )}

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
          {clientHref ? (
            <Link href={clientHref} className="font-medium hover:underline">
              {invoice.client.name}
            </Link>
          ) : (
            <p className="font-medium">{invoice.client.name}</p>
          )}
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
      </div>

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
    </>
  );
}
