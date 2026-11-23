import { describe, expect, it } from "vitest";
import {
  buildInvoiceEmail,
  buildPaidNotificationEmail,
  buildReceiptEmail,
  buildReminderEmail,
  escapeHtml,
} from "@/lib/emails/invoice-email";

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

describe("buildReminderEmail", () => {
  it("says how late the invoice is and links to it", () => {
    const email = buildReminderEmail({ ...input, daysOverdue: 5 });

    expect(email.subject).toBe("Reminder: invoice INV-0042 is overdue");
    expect(email.text).toContain("is now 5 days overdue");
    for (const part of [email.text, email.html]) {
      expect(part).toContain("$941.78");
      expect(part).toContain(input.link);
    }
    expect(email.html).toContain("<strong>INV-0042</strong>");
  });

  it("uses the singular for one day", () => {
    expect(buildReminderEmail({ ...input, daysOverdue: 1 }).text).toContain(
      "now 1 day overdue",
    );
  });

  it("escapes a sender name that contains HTML", () => {
    const email = buildReminderEmail({
      ...input,
      senderName: "<script>x</script>",
      daysOverdue: 3,
    });

    expect(email.html).not.toContain("<script>");
  });
});

describe("buildReceiptEmail", () => {
  const paidAt = new Date("2026-11-20T15:00:00Z");

  it("confirms the amount paid to the client", () => {
    const email = buildReceiptEmail({ ...input, paidAt });

    expect(email.subject).toBe("Receipt: invoice INV-0042 is paid");
    expect(email.text).toMatch(/^Hi Grace Hopper,/);
    expect(email.text).toContain("Amount paid: $941.78 on Nov 20, 2026");
    expect(email.html).toContain("Amount paid");
    expect(email.html).not.toContain("Amount due");
  });
});

describe("buildPaidNotificationEmail", () => {
  const paidAt = new Date("2026-11-20T15:00:00Z");

  it("tells the freelancer who paid and how much", () => {
    const email = buildPaidNotificationEmail({
      ...input,
      link: "https://paydesk.example/invoices/inv_1",
      paidAt,
    });

    expect(email.subject).toBe("You got paid: INV-0042 ($941.78)");
    expect(email.text).toMatch(/^Hi Ada Lovelace,/);
    expect(email.text).toContain("Grace Hopper paid invoice INV-0042");
    expect(email.html).toContain("https://paydesk.example/invoices/inv_1");
  });

  it("escapes a client name that contains HTML", () => {
    const email = buildPaidNotificationEmail({
      ...input,
      clientName: "<b>Evil</b>",
      paidAt,
    });

    expect(email.html).not.toContain("<b>Evil</b>");
  });
});

describe("escapeHtml", () => {
  it("escapes all HTML special characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });
});
