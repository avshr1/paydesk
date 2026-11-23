import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emailConfigured: true,
  findUnique: vi.fn(),
  logCreate: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: { findUnique: mocks.findUnique },
    emailLog: { create: mocks.logCreate },
  },
}));
vi.mock("@/lib/email", () => ({
  get isEmailConfigured() {
    return mocks.emailConfigured;
  },
  sendEmail: mocks.sendEmail,
}));
vi.mock("@/lib/env", () => ({ env: { APP_URL: "https://paydesk.example" } }));

const { sendPaymentEmails } = await import("@/lib/payment-emails");

const paidInvoice = {
  id: "inv_1",
  number: "INV-0007",
  publicToken: "tok_1",
  totalCents: 75000,
  currency: "usd",
  dueDate: new Date("2026-11-30T00:00:00Z"),
  paidAt: new Date("2026-11-20T15:00:00Z"),
  client: { name: "Grace Hopper", email: "grace@example.com" },
  user: { name: "Ada Lovelace", email: "ada@example.com" },
};

describe("sendPaymentEmails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.emailConfigured = true;
    mocks.findUnique.mockResolvedValue(paidInvoice);
    mocks.sendEmail.mockResolvedValue({ ok: true, id: "email_1" });
    mocks.logCreate.mockResolvedValue({});
  });

  it("emails a receipt to the client and a notice to the freelancer", async () => {
    await sendPaymentEmails("inv_1");

    const sent = mocks.sendEmail.mock.calls.map((call) => call[0]);
    expect(sent.map((email) => email.to)).toEqual([
      "grace@example.com",
      "ada@example.com",
    ]);
    expect(sent[0].subject).toBe("Receipt: invoice INV-0007 is paid");
    expect(sent[0].text).toContain("https://paydesk.example/i/tok_1");
    expect(sent[1].subject).toBe("You got paid: INV-0007 ($750.00)");
    expect(sent[1].text).toContain("https://paydesk.example/invoices/inv_1");
  });

  it("logs the receipt, including a failure", async () => {
    mocks.sendEmail
      .mockResolvedValueOnce({ ok: false, error: "Mailbox full" })
      .mockResolvedValueOnce({ ok: true, id: "email_2" });

    await sendPaymentEmails("inv_1");

    expect(mocks.logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "RECEIPT",
        to: "grace@example.com",
        status: "FAILED",
        error: "Mailbox full",
      }),
    });
  });

  it("sends nothing when email isn't set up", async () => {
    mocks.emailConfigured = false;

    await sendPaymentEmails("inv_1");

    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("sends nothing for an invoice that isn't paid", async () => {
    mocks.findUnique.mockResolvedValue({ ...paidInvoice, paidAt: null });

    await sendPaymentEmails("inv_1");

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
