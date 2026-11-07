import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  logCreate: vi.fn((args: unknown) => args),
  updateMany: vi.fn((args: unknown) => args),
  transaction: vi.fn(async (ops: unknown[]) => ops),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: { findFirst: mocks.findFirst, updateMany: mocks.updateMany },
    emailLog: { create: mocks.logCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({ sendEmail: mocks.sendEmail }));

const { deliverInvoice, publicInvoiceUrl } =
  await import("@/lib/invoice-delivery");

const draft = {
  number: "INV-0001",
  status: "DRAFT",
  publicToken: "tok_123",
  totalCents: 94178,
  currency: "usd",
  dueDate: new Date("2026-11-30T00:00:00Z"),
  client: { name: "Grace Hopper", email: "grace@example.com" },
  user: { name: "Ada Lovelace", email: "ada@example.com" },
};

describe("deliverInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(draft);
  });

  it("only looks up invoices owned by the user", async () => {
    mocks.findFirst.mockResolvedValue(null);

    expect(await deliverInvoice("user_1", "inv_1")).toEqual({
      status: "not_found",
    });
    expect(mocks.findFirst.mock.calls[0]?.[0].where).toEqual({
      id: "inv_1",
      userId: "user_1",
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("emails the client, logs it, and marks the invoice sent", async () => {
    mocks.sendEmail.mockResolvedValue({ ok: true, id: "email_1" });

    expect(await deliverInvoice("user_1", "inv_1")).toEqual({ status: "sent" });

    const message = mocks.sendEmail.mock.calls[0]?.[0];
    expect(message.to).toBe("grace@example.com");
    expect(message.text).toContain(publicInvoiceUrl("tok_123"));
    expect(mocks.logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "SENT",
        providerId: "email_1",
        to: "grace@example.com",
      }),
    });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "inv_1", userId: "user_1", status: "DRAFT" },
      data: { status: "SENT", sentAt: expect.any(Date) },
    });
  });

  it("keeps the invoice a draft and logs the error when email fails", async () => {
    mocks.sendEmail.mockResolvedValue({ ok: false, error: "Service down" });

    expect(await deliverInvoice("user_1", "inv_1")).toEqual({
      status: "failed",
      error: "Service down",
    });
    expect(mocks.logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "FAILED",
        error: "Service down",
      }),
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("won't email an invoice that was already sent", async () => {
    mocks.findFirst.mockResolvedValue({ ...draft, status: "SENT" });

    expect(await deliverInvoice("user_1", "inv_1")).toEqual({
      status: "failed",
      error: "This invoice has already been sent.",
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
