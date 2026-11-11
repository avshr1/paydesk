import { describe, expect, it } from "vitest";
import {
  formatQuantity,
  formatStatus,
  formatTaxRate,
  pdfFilename,
} from "@/lib/invoice-format";

describe("invoice formatting", () => {
  it("formats quantities without trailing zeros", () => {
    expect(formatQuantity(1250)).toBe("12.5");
    expect(formatQuantity(100)).toBe("1");
  });

  it("formats basis points as a percentage", () => {
    expect(formatTaxRate(825)).toBe("8.25%");
    expect(formatTaxRate(0)).toBe("0%");
  });

  it("formats statuses for display", () => {
    expect(formatStatus("OVERDUE")).toBe("Overdue");
  });
});

describe("pdfFilename", () => {
  it("names the file after the invoice", () => {
    expect(pdfFilename("INV-0001")).toBe("INV-0001.pdf");
  });

  it("strips characters that could break the download header", () => {
    expect(pdfFilename('INV-1"\r\nX')).toBe("INV-1X.pdf");
    expect(pdfFilename("")).toBe("invoice.pdf");
  });
});
