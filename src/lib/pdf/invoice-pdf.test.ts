import { describe, expect, it } from "vitest";
import { renderInvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf";

const now = new Date("2026-11-01T00:00:00Z");

const sampleInvoice: InvoicePdfData = {
  from: { name: "Ada Lovelace", email: "ada@example.com" },
  invoice: {
    id: "inv_1",
    userId: "user_1",
    clientId: "client_1",
    number: "INV-0042",
    status: "SENT",
    publicToken: "tok",
    issueDate: now,
    dueDate: new Date("2026-11-30T00:00:00Z"),
    notes: "Thank you for your business.",
    taxRateBps: 825,
    subtotalCents: 87000,
    taxCents: 7178,
    totalCents: 94178,
    currency: "usd",
    sentAt: now,
    paidAt: null,
    lastReminderAt: null,
    reminderCount: 0,
    createdAt: now,
    updatedAt: now,
    client: {
      id: "client_1",
      userId: "user_1",
      name: "Grace Hopper",
      email: "grace@example.com",
      company: "Navy Labs",
      address: "1 Harbor St\nArlington, VA",
      notes: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    lineItems: [
      {
        id: "li_1",
        invoiceId: "inv_1",
        position: 0,
        description: "Website design",
        quantityHundredths: 1000,
        unitPriceCents: 7500,
        amountCents: 75000,
      },
      {
        id: "li_2",
        invoiceId: "inv_1",
        position: 1,
        description: "Hosting (annual)",
        quantityHundredths: 100,
        unitPriceCents: 12000,
        amountCents: 12000,
      },
    ],
  },
};

describe("renderInvoicePdf", () => {
  it("renders a valid one-page PDF", async () => {
    const pdf = await renderInvoicePdf(sampleInvoice);

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1")).toMatch(/\/Count 1\b/);
  });
});
