import { describe, expect, it } from "vitest";
import { buildInvoiceEmail, escapeHtml } from "@/lib/emails/invoice-email";

const input = {
  invoiceNumber: "INV-0042",
  senderName: "Ada Lovelace",
  clientName: "Grace Hopper",
  totalCents: 94178,
  currency: "usd",
  dueDate: new Date("2026-11-30T00:00:00Z"),
  link: "https://paydesk.example/i/abc123",
};

describe("buildInvoiceEmail", () => {
  it("includes the number, amount, due date, and link", () => {
    const email = buildInvoiceEmail(input);

    expect(email.subject).toBe("Invoice INV-0042 from Ada Lovelace");
    for (const part of [email.text, email.html]) {
      expect(part).toContain("$941.78");
      expect(part).toContain("Nov 30, 2026");
      expect(part).toContain(input.link);
    }
  });

  it("escapes user-typed names in the HTML", () => {
    const email = buildInvoiceEmail({
      ...input,
      clientName: '<img src=x onerror="alert(1)">',
    });

    expect(email.html).not.toContain("<img");
    expect(email.html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});

describe("escapeHtml", () => {
  it("escapes all HTML special characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });
});
