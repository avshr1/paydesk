export type MonthRevenue = {
  month: string; // "2026-11"
  label: string; // "Nov"
  cents: number;
};

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

// Turns revenue rows, which only exist for months with payments, into one
// entry per month for the last `count` months, oldest first. Months are UTC.
export function bucketRevenueByMonth(
  rows: { month: string; cents: number }[],
  now: Date = new Date(),
  count = 12,
): MonthRevenue[] {
  const byMonth = new Map(rows.map((row) => [row.month, row.cents]));

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - (count - 1 - index),
        1,
      ),
    );
    const month = monthKey(date);
    return {
      month,
      label: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      cents: byMonth.get(month) ?? 0,
    };
  });
}
