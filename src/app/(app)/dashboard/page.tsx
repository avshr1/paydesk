import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { auth } from "@/auth";
import { getDashboardSummary, listRecentInvoices } from "@/lib/dashboard";
import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { requireUserId } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard · Paydesk" };

function SummaryCard({
  label,
  cents,
  detail,
}: {
  label: string;
  cents: number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {formatCents(cents)}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

const countLabel = (count: number) =>
  `${count} ${count === 1 ? "invoice" : "invoices"}`;

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [session, summary, recent] = await Promise.all([
    auth(),
    getDashboardSummary(userId),
    listRecentInvoices(userId),
  ]);
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
        <Link
          href="/invoices/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New invoice
        </Link>
      </div>

      {summary.invoiceCount === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Add a client, then create your first invoice. Your totals will show
            up here.
          </p>
          <Link href="/clients/new" className="text-sm font-medium underline">
            Add a client
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Paid"
              cents={summary.paidCents}
              detail={countLabel(summary.paidCount)}
            />
            <SummaryCard
              label="Outstanding"
              cents={summary.outstandingCents}
              detail={`${countLabel(summary.outstandingCount)}, including overdue`}
            />
            <SummaryCard
              label="Overdue"
              cents={summary.overdueCents}
              detail={countLabel(summary.overdueCount)}
            />
          </div>

          <section aria-labelledby="recent" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="recent" className="font-medium">
                Recent invoices
              </h2>
              <Link href="/invoices" className="text-sm underline">
                View all
              </Link>
            </div>
            <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {recent.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm">{invoice.number}</p>
                      <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                        {invoice.client.name} · due{" "}
                        {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={invoice.status} />
                      <span className="text-sm font-medium tabular-nums">
                        {formatCents(invoice.totalCents, invoice.currency)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
