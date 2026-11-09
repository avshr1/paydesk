import { describe, expect, it } from "vitest";
import { bucketRevenueByMonth } from "@/lib/revenue";

const now = new Date("2026-11-08T12:00:00Z");

describe("bucketRevenueByMonth", () => {
  it("returns 12 months, oldest first, ending this month", () => {
    const months = bucketRevenueByMonth([], now);

    expect(months).toHaveLength(12);
    expect(months[0]?.month).toBe("2025-12");
    expect(months[11]?.month).toBe("2026-11");
    expect(months[11]?.label).toBe("Nov");
  });

  it("fills months with no revenue with zero", () => {
    const months = bucketRevenueByMonth(
      [{ month: "2026-10", cents: 50000 }],
      now,
    );

    expect(months[10]).toMatchObject({ month: "2026-10", cents: 50000 });
    expect(months[9]).toMatchObject({ month: "2026-09", cents: 0 });
    expect(months.reduce((sum, m) => sum + m.cents, 0)).toBe(50000);
  });

  it("ignores rows outside the window", () => {
    const months = bucketRevenueByMonth(
      [{ month: "2025-11", cents: 12345 }],
      now,
    );

    expect(months.every((m) => m.cents === 0)).toBe(true);
  });

  it("handles month-end dates without skipping a month", () => {
    const months = bucketRevenueByMonth(
      [],
      new Date("2026-03-31T23:00:00Z"),
      3,
    );

    expect(months.map((m) => m.month)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });
});
