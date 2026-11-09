import { InvoiceStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { pastDueCutoff } from "@/lib/invoice-status";
import { bucketRevenueByMonth } from "@/lib/revenue";

const { SENT, PAID, OVERDUE } = InvoiceStatus;

function sumInvoices(
  where: Parameters<typeof db.invoice.aggregate>[0]["where"],
) {
  return db.invoice.aggregate({
    where,
    _sum: { totalCents: true },
    _count: true,
  });
}

// Totals are computed by the database, not by loading every invoice. Overdue
// includes SENT invoices past their due date, so it's right even between runs
// of the daily job that marks them OVERDUE.
export async function getDashboardSummary(
  userId: string,
  now: Date = new Date(),
) {
  const [paid, outstanding, overdue, invoiceCount] = await Promise.all([
    sumInvoices({ userId, status: PAID }),
    sumInvoices({ userId, status: { in: [SENT, OVERDUE] } }),
    sumInvoices({
      userId,
      OR: [
        { status: OVERDUE },
        { status: SENT, dueDate: { lte: pastDueCutoff(now) } },
      ],
    }),
    db.invoice.count({ where: { userId } }),
  ]);

  return {
    invoiceCount,
    paidCents: paid._sum.totalCents ?? 0,
    paidCount: paid._count,
    outstandingCents: outstanding._sum.totalCents ?? 0,
    outstandingCount: outstanding._count,
    overdueCents: overdue._sum.totalCents ?? 0,
    overdueCount: overdue._count,
  };
}

export function listRecentInvoices(userId: string) {
  return db.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { client: { select: { name: true } } },
  });
}

const REVENUE_MONTHS = 12;

// Summed by the database. Paid invoices are grouped by the month of paidAt.
export async function getMonthlyRevenue(
  userId: string,
  now: Date = new Date(),
) {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (REVENUE_MONTHS - 1), 1),
  );
  const rows = await db.$queryRaw<{ month: string; cents: bigint }[]>`
    SELECT to_char("paidAt", 'YYYY-MM') AS month,
           SUM("totalCents")::bigint AS cents
    FROM "Invoice"
    WHERE "userId" = ${userId}
      AND "status" = 'PAID'
      AND "paidAt" >= ${start}
    GROUP BY 1
  `;

  return bucketRevenueByMonth(
    rows.map((row) => ({ month: row.month, cents: Number(row.cents) })),
    now,
    REVENUE_MONTHS,
  );
}
