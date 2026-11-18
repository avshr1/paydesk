import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicInvoice: vi.fn(),
  createSession: vi.fn(),
  stripeConfigured: true,
}));

vi.mock("@/lib/invoices", () => ({ getPublicInvoice: mocks.getPublicInvoice }));
vi.mock("@/lib/env", () => ({ env: { APP_URL: "https://paydesk.example" } }));
vi.mock("@/lib/stripe", () => ({
  get stripe() {
    return mocks.stripeConfigured
      ? { checkout: { sessions: { create: mocks.createSession } } }
      : null;
  },
}));

const { createCheckoutForToken } = await import("@/lib/checkout");

const invoice = {
  id: "inv_1",
  number: "INV-0007",
  status: "SENT",
  totalCents: 94178,
  currency: "usd",
  client: { email: "grace@example.com" },
  user: { name: "Ada Lovelace", email: "ada@example.com" },
};

describe("createCheckoutForToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.stripeConfigured = true;
    mocks.getPublicInvoice.mockResolvedValue(invoice);
    mocks.createSession.mockResolvedValue({
      url: "https://checkout.stripe.com/x",
    });
  });

  it("charges the total stored on the server and tags the invoice", async () => {
    expect(await createCheckoutForToken("tok")).toEqual({
      status: "redirect",
      url: "https://checkout.stripe.com/x",
    });

    const params = mocks.createSession.mock.calls[0]?.[0];
    expect(params.line_items[0].price_data).toMatchObject({
      currency: "usd",
      unit_amount: 94178,
    });
    expect(params.metadata).toEqual({ invoiceId: "inv_1" });
    expect(params.success_url).toBe("https://paydesk.example/i/tok/paid");
    expect(params.cancel_url).toBe(
      "https://paydesk.example/i/tok?payment=cancelled",
    );
  });

  it("returns not found for an unknown or draft invoice", async () => {
    mocks.getPublicInvoice.mockResolvedValue(null);

    expect(await createCheckoutForToken("tok")).toEqual({
      status: "not_found",
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("won't take a second payment for a paid invoice", async () => {
    mocks.getPublicInvoice.mockResolvedValue({ ...invoice, status: "PAID" });

    expect(await createCheckoutForToken("tok")).toMatchObject({
      status: "error",
      error: "This invoice has already been paid.",
    });
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("explains when payments aren't set up", async () => {
    mocks.stripeConfigured = false;

    expect(await createCheckoutForToken("tok")).toMatchObject({
      status: "error",
      error: expect.stringContaining("aren't set up yet"),
    });
  });

  it("returns a friendly error if Stripe fails", async () => {
    mocks.createSession.mockRejectedValue(new Error("Stripe is down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await createCheckoutForToken("tok")).toMatchObject({
      status: "error",
      error: "Couldn't start the payment. Please try again in a moment.",
    });
  });
});
