import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "whsec_test_secret_for_unit_tests";

const mocks = vi.hoisted(() => ({
  secret: "whsec_test_secret_for_unit_tests" as string | undefined,
  handleStripeEvent: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    get STRIPE_WEBHOOK_SECRET() {
      return mocks.secret;
    },
  },
}));
vi.mock("@/lib/payments", () => ({
  handleStripeEvent: mocks.handleStripeEvent,
}));

const { POST } = await import("./route");

const payload = JSON.stringify({
  id: "evt_123",
  object: "event",
  type: "checkout.session.completed",
  data: { object: { id: "cs_123", object: "checkout.session" } },
});

// Signed exactly the way Stripe signs real webhooks.
function signed(body: string, secret = SECRET) {
  return Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
}

function post(body: string, signature?: string) {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: signature ? { "stripe-signature": signature } : {},
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.secret = SECRET;
    mocks.handleStripeEvent.mockResolvedValue("processed");
  });

  it("accepts a correctly signed event and handles it", async () => {
    const res = await POST(post(payload, signed(payload)));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, outcome: "processed" });
    expect(mocks.handleStripeEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt_123" }),
    );
  });

  it("rejects an event signed with the wrong secret", async () => {
    const res = await POST(post(payload, signed(payload, "whsec_attacker")));

    expect(res.status).toBe(400);
    expect(mocks.handleStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects a body that was changed after signing", async () => {
    const tampered = payload.replace("cs_123", "cs_999");

    const res = await POST(post(tampered, signed(payload)));

    expect(res.status).toBe(400);
    expect(mocks.handleStripeEvent).not.toHaveBeenCalled();
  });

  it("rejects a request with no signature", async () => {
    const res = await POST(post(payload));

    expect(res.status).toBe(400);
    expect(mocks.handleStripeEvent).not.toHaveBeenCalled();
  });

  it("refuses to run when the webhook secret isn't configured", async () => {
    mocks.secret = undefined;

    const res = await POST(post(payload, signed(payload)));

    expect(res.status).toBe(503);
    expect(mocks.handleStripeEvent).not.toHaveBeenCalled();
  });
});
