import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  stripeEvent: { createMany: vi.fn() },
  invoice: { findUnique: vi.fn(), updateMany: vi.fn() },
  payment: { create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  },
}));

const { handleStripeEvent } = await import("@/lib/payments");

function completed(overrides: Record<string, unknown> = {}): Stripe.Event {
  return {
    id: "evt_1",
    type: "checkout.session.completed",
    created: 1_794_000_000,
    data: {
      object: {
        id: "cs_1",
        payment_status: "paid",
        amount_total: 94178,
        currency: "usd",
        payment_intent: "pi_1",
        metadata: { invoiceId: "inv_1" },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

const invoice = {
  id: "inv_1",
  status: "SENT",
  totalCents: 94178,
  currency: "usd",
};

describe("handleStripeEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.stripeEvent.createMany.mockResolvedValue({ count: 1 });
    tx.invoice.findUnique.mockResolvedValue(invoice);
    tx.invoice.updateMany.mockResolvedValue({ count: 1 });
    tx.payment.create.mockResolvedValue({});
  });

  it("records the payment and marks the invoice paid", async () => {
    expect(await handleStripeEvent(completed())).toBe("processed");

    expect(tx.stripeEvent.createMany).toHaveBeenCalledWith({
      data: { id: "evt_1", type: "checkout.session.completed" },
      skipDuplicates: true,
    });
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        invoiceId: "inv_1",
        amountCents: 94178,
        stripeSessionId: "cs_1",
        stripePaymentIntentId: "pi_1",
      },
    });
    expect(tx.invoice.updateMany).toHaveBeenCalledWith({
      where: { id: "inv_1", status: { in: ["SENT", "OVERDUE"] } },
      data: { status: "PAID", paidAt: new Date(1_794_000_000 * 1000) },
    });
  });

  it("does nothing for an event it has already processed", async () => {
    tx.stripeEvent.createMany.mockResolvedValue({ count: 0 });

    expect(await handleStripeEvent(completed())).toBe("duplicate");
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.invoice.updateMany).not.toHaveBeenCalled();
  });

  it("records the payment but doesn't mark paid if the amount differs", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await handleStripeEvent(completed({ amount_total: 100 }))).toBe(
      "processed",
    );
    expect(tx.payment.create).toHaveBeenCalled();
    expect(tx.invoice.updateMany).not.toHaveBeenCalled();
  });

  it("ignores other event types and unpaid sessions", async () => {
    const other = { ...completed(), type: "customer.created" } as Stripe.Event;

    expect(await handleStripeEvent(other)).toBe("ignored");
    expect(
      await handleStripeEvent(completed({ payment_status: "unpaid" })),
    ).toBe("ignored");
    expect(tx.stripeEvent.createMany).not.toHaveBeenCalled();
  });

  it("ignores a paid session with no matching invoice", async () => {
    tx.invoice.findUnique.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await handleStripeEvent(completed())).toBe("ignored");
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});
