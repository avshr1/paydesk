import { describe, expect, it } from "vitest";
import {
  calculateTotals,
  formatCents,
  lineAmountCents,
  parseHundredths,
} from "@/lib/money";

describe("lineAmountCents", () => {
  it("multiplies whole quantities", () => {
    expect(
      lineAmountCents({ quantityHundredths: 300, unitPriceCents: 2500 }),
    ).toBe(7500);
  });

  it("handles fractional quantities like 1.5 hours", () => {
    expect(
      lineAmountCents({ quantityHundredths: 150, unitPriceCents: 8000 }),
    ).toBe(12000);
  });

  it("rounds half a cent up", () => {
    // 1.5 × $3.33 = $4.995
    expect(
      lineAmountCents({ quantityHundredths: 150, unitPriceCents: 333 }),
    ).toBe(500);
  });

  it("rounds less than half a cent down", () => {
    // 0.33 × $0.10 = $0.033
    expect(
      lineAmountCents({ quantityHundredths: 33, unitPriceCents: 10 }),
    ).toBe(3);
  });

  it("rejects negative and fractional inputs", () => {
    expect(() =>
      lineAmountCents({ quantityHundredths: -100, unitPriceCents: 100 }),
    ).toThrow(RangeError);
    expect(() =>
      lineAmountCents({ quantityHundredths: 100, unitPriceCents: 1.5 }),
    ).toThrow(RangeError);
  });
});

describe("calculateTotals", () => {
  it("adds line items and tax", () => {
    const totals = calculateTotals(
      [
        { quantityHundredths: 1000, unitPriceCents: 7500 }, // 10 h × $75
        { quantityHundredths: 100, unitPriceCents: 12000 }, // 1 × $120
      ],
      825, // 8.25%
    );

    expect(totals).toEqual({
      lineAmountsCents: [75000, 12000],
      subtotalCents: 87000,
      taxCents: 7178, // $71.775 rounds up
      totalCents: 94178,
    });
  });

  it("avoids floating-point errors", () => {
    // $0.10 + $0.20 must be exactly $0.30
    const totals = calculateTotals(
      [
        { quantityHundredths: 100, unitPriceCents: 10 },
        { quantityHundredths: 100, unitPriceCents: 20 },
      ],
      0,
    );

    expect(totals.totalCents).toBe(30);
  });

  it("returns zeros for an invoice with no line items", () => {
    expect(calculateTotals([], 825)).toEqual({
      lineAmountsCents: [],
      subtotalCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });

  it("rejects a negative tax rate", () => {
    expect(() => calculateTotals([], -1)).toThrow(RangeError);
  });
});

describe("parseHundredths", () => {
  it.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.05", 1205],
    ["0.99", 99],
    [" 1,234.56 ", 123456],
  ])("parses %j as %i", (input, expected) => {
    expect(parseHundredths(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1.234", "1.", ".5", "1e3"])(
    "rejects %j",
    (input) => {
      expect(parseHundredths(input)).toBeNull();
    },
  );
});

describe("formatCents", () => {
  it("formats cents as dollars", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(5)).toBe("$0.05");
  });
});
