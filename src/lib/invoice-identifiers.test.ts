import { describe, expect, it } from "vitest";
import {
  formatInvoiceNumber,
  generatePublicToken,
  nextInvoiceNumber,
} from "@/lib/invoice-identifiers";

describe("formatInvoiceNumber", () => {
  it("pads to four digits", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-0001");
    expect(formatInvoiceNumber(42)).toBe("INV-0042");
  });

  it("grows past four digits", () => {
    expect(formatInvoiceNumber(12345)).toBe("INV-12345");
  });

  it("rejects zero, negatives, and fractions", () => {
    expect(() => formatInvoiceNumber(0)).toThrow(RangeError);
    expect(() => formatInvoiceNumber(-1)).toThrow(RangeError);
    expect(() => formatInvoiceNumber(1.5)).toThrow(RangeError);
  });
});

describe("nextInvoiceNumber", () => {
  it("starts at INV-0001", () => {
    expect(nextInvoiceNumber(null)).toBe("INV-0001");
  });

  it("increments the latest number", () => {
    expect(nextInvoiceNumber("INV-0041")).toBe("INV-0042");
    expect(nextInvoiceNumber("INV-9999")).toBe("INV-10000");
  });

  it("rejects a malformed number", () => {
    expect(() => nextInvoiceNumber("ABC-1")).toThrow(/Unrecognized/);
  });
});

describe("generatePublicToken", () => {
  it("is URL-safe and 43 characters long", () => {
    expect(generatePublicToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("is different every time", () => {
    const tokens = new Set(Array.from({ length: 1000 }, generatePublicToken));
    expect(tokens.size).toBe(1000);
  });
});
