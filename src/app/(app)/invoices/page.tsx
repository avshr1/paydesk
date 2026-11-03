import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { InvoiceStatus } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/dates";
import { listInvoices } from "@/lib/invoices";
import { formatCents } from "@/lib/money";
import { requireUserId } from "@/lib/session";

export const metadata: Metadata = { title: "Invoices · Paydesk" };

const filters = [undefined, ...Object.values(InvoiceStatus)] as const;

function isStatus(value: unknown): value is InvoiceStatus {
  return Object.values(InvoiceStatus).includes(value as InvoiceStatus);
}

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/invoices">) {
  const { status: param } = await searchParams;
  const status = isStatus(param) ? param : undefined;
  const userId = await requireUserId();
  const invoices = await listInvoices(userId, status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter === status;
          return (
            <Link
              key={filter ?? "ALL"}
              href={filter ? `/invoices?status=${filter}` : "/invoices"}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-sm ${
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              }`}
            >
              {filter
                ? filter.charAt(0) + filter.slice(1).toLowerCase()
                : "All"}
            </Link>
          );
        })}
      </nav>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">
            {status ? "No invoices with this status" : "No invoices yet"}
          </p>
          {!status && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Create an invoice to bill one of your clients.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link
                href={`/invoices/${invoice.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-zinc-50 sm:grid-cols-[8rem_1fr_auto_auto] dark:hover:bg-zinc-900"
              >
                <span className="font-mono text-sm">{invoice.number}</span>
                <span className="order-3 truncate text-sm text-zinc-600 sm:order-none dark:text-zinc-400">
                  {invoice.client.name} · due {formatDate(invoice.dueDate)}
                </span>
                <StatusBadge status={invoice.status} />
                <span className="order-4 text-right font-medium tabular-nums sm:order-none">
                  {formatCents(invoice.totalCents, invoice.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
