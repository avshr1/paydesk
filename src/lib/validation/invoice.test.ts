import { describe, expect, it } from "vitest";
import { invoiceSchema } from "@/lib/validation/invoice";

const valid = {
  clientId: "client_123",
  issueDate: "2026-11-01",
  dueDate: "2026-11-15",
  taxRateBps: "8.25",
  notes: "",
  lineItems: [
    {
      description: "Design work",
      quantityHundredths: "1.5",
      unitPriceCents: "80",
    },
    {
      description: "Hosting",
      quantityHundredths: "1",
      unitPriceCents: "1,200.00",
    },
  ],
};

function firstError(input: unknown) {
  const result = invoiceSchema.safeParse(input);
  return result.success ? null : result.error.issues[0];
}

describe("invoiceSchema", () => {
  it("parses typed amounts into integers", () => {
    expect(invoiceSchema.parse(valid)).toEqual({
      clientId: "client_123",
      issueDate: "2026-11-01",
      dueDate: "2026-11-15",
      taxRateBps: 825,
      notes: undefined,
      lineItems: [
        {
          description: "Design work",
          quantityHundredths: 150,
          unitPriceCents: 8000,
        },
        {
          description: "Hosting",
          quantityHundredths: 100,
          unitPriceCents: 120000,
        },
      ],
    });
  });

  it("allows the due date to equal the issue date", () => {
    expect(
      invoiceSchema.safeParse({ ...valid, dueDate: valid.issueDate }).success,
    ).toBe(true);
  });

  it("rejects a due date before the issue date", () => {
    expect(firstError({ ...valid, dueDate: "2026-10-31" })).toMatchObject({
      path: ["dueDate"],
      message: "Due date can't be before the issue date",
    });
  });

  it("requires at least one line item", () => {
    expect(firstError({ ...valid, lineItems: [] })?.message).toBe(
      "Add at least one line item",
    );
  });

  it("rejects a zero quantity", () => {
    const lineItems = [{ ...valid.lineItems[0], quantityHundredths: "0" }];
    expect(firstError({ ...valid, lineItems })?.message).toBe(
      "Quantity must be more than 0",
    );
  });

  it("rejects a price that isn't a number", () => {
    const lineItems = [{ ...valid.lineItems[0], unitPriceCents: "ten" }];
    expect(firstError({ ...valid, lineItems })?.message).toBe(
      "Unit price must be a number with up to 2 decimals",
    );
  });

  it("rejects a tax rate over 100%", () => {
    expect(firstError({ ...valid, taxRateBps: "100.01" })?.message).toBe(
      "Tax rate can't be more than 100%",
    );
  });

  it("rejects an invalid date", () => {
    expect(firstError({ ...valid, issueDate: "2026-02-30" })?.message).toBe(
      "Enter a valid date",
    );
  });
});
