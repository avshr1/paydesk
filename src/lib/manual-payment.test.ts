import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: { updateMany: mocks.updateMany, findFirst: mocks.findFirst },
  },
}));

const { markInvoicePaid, markInvoiceUnpaid } =
  await import("@/lib/manual-payment");

const now = new Date("2026-11-26T12:00:00Z");

describe("markInvoicePaid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks a sent or overdue invoice owned by the user as paid", async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });

    expect(await markInvoicePaid("user_1", "inv_1", now)).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "inv_1",
        userId: "user_1",
        status: { in: ["SENT", "OVERDUE"] },
      },
      data: { status: "PAID", paidAt: now },
    });
  });

  it("does nothing for drafts, paid invoices, or other users' invoices", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    expect(await markInvoicePaid("user_1", "inv_1", now)).toBe(false);
  });
});

describe("markInvoiceUnpaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns a not-yet-due invoice to Sent", async () => {
    mocks.findFirst.mockResolvedValue({
      dueDate: new Date("2026-12-15T00:00:00Z"),
      _count: { payments: 0 },
    });

    expect(await markInvoiceUnpaid("user_1", "inv_1", now)).toBe("done");
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "inv_1", userId: "user_1", status: "PAID" },
      data: { status: "SENT", paidAt: null },
    });
  });

  it("returns a past-due invoice to Overdue", async () => {
    mocks.findFirst.mockResolvedValue({
      dueDate: new Date("2026-11-01T00:00:00Z"),
      _count: { payments: 0 },
    });

    await markInvoiceUnpaid("user_1", "inv_1", now);

    expect(mocks.updateMany.mock.calls[0]?.[0].data.status).toBe("OVERDUE");
  });

  it("refuses when Stripe recorded a card payment", async () => {
    mocks.findFirst.mockResolvedValue({
      dueDate: new Date("2026-12-15T00:00:00Z"),
      _count: { payments: 1 },
    });

    expect(await markInvoiceUnpaid("user_1", "inv_1", now)).toBe(
      "has_card_payment",
    );
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns not_found for an invoice that isn't the user's paid invoice", async () => {
    mocks.findFirst.mockResolvedValue(null);

    expect(await markInvoiceUnpaid("user_1", "inv_1", now)).toBe("not_found");
  });
});
