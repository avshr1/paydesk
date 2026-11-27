import { expect, test } from "@playwright/test";
import pg from "pg";
import Stripe from "stripe";
import { E2E_WEBHOOK_SECRET } from "./constants";

// The payment journey after Stripe Checkout: a signed webhook marks the
// invoice paid, exactly once, and every page reflects it. Stripe's own card
// form isn't covered here; that needs real test-mode keys.
test("a paid Checkout session marks the invoice paid everywhere", async ({
  page,
  request,
}) => {
  test.skip(!process.env.DATABASE_URL, "Needs DATABASE_URL to set up data");

  await test.step("create an invoice", async () => {
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Penny Paid");
    await page.getByLabel("Email").fill(`pay-${Date.now()}@paydesk.test`);
    await page.getByLabel("Password").fill("payment-password-123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/clients/new");
    await page.getByLabel("Name").fill("Grace Hopper");
    await page.getByLabel("Email").fill("grace@example.com");
    await page.getByRole("button", { name: "Add client" }).click();
    await expect(page).toHaveURL(/\/clients$/);

    await page.goto("/invoices/new");
    await page.getByLabel("Line 1 description").fill("Website design");
    await page.getByLabel("Line 1 quantity").fill("10");
    await page.getByLabel("Line 1 unit price").fill("75");
    await page.getByRole("button", { name: "Create invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/(?!new$)[^/]+$/);
  });
  const invoicePath = new URL(page.url()).pathname;
  const invoiceId = invoicePath.split("/").pop()!;

  // Sending needs email, which tests don't have, so mark it sent directly.
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const {
    rows: [invoice],
  } = await db.query<{ publicToken: string; totalCents: number }>(
    `UPDATE "Invoice" SET status = 'SENT', "sentAt" = now() WHERE id = $1
     RETURNING "publicToken", "totalCents"`,
    [invoiceId],
  );
  await db.end();
  expect(invoice?.totalCents).toBe(75000);

  const payload = JSON.stringify({
    id: `evt_e2e_${invoiceId}`,
    object: "event",
    type: "checkout.session.completed",
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: `cs_e2e_${invoiceId}`,
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 75000,
        currency: "usd",
        payment_intent: `pi_e2e_${invoiceId}`,
        metadata: { invoiceId },
      },
    },
  });
  const deliver = () =>
    request.post("/api/webhooks/stripe", {
      data: payload,
      headers: {
        "content-type": "application/json",
        "stripe-signature": Stripe.webhooks.generateTestHeaderString({
          payload,
          secret: E2E_WEBHOOK_SECRET,
        }),
      },
    });

  await test.step("Stripe's webhook marks it paid, exactly once", async () => {
    expect(await (await deliver()).json()).toMatchObject({
      outcome: "paid",
    });
    // Stripe may deliver the same event twice.
    expect(await (await deliver()).json()).toMatchObject({
      outcome: "duplicate",
    });
  });

  await test.step("the client's page shows it paid", async () => {
    await page.goto(`/i/${invoice!.publicToken}`);
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pay / })).toHaveCount(0);

    await page.goto(`/i/${invoice!.publicToken}/paid`);
    await expect(
      page.getByRole("heading", { name: "Payment received" }),
    ).toBeVisible();
  });

  await test.step("the freelancer sees one payment and the total", async () => {
    await page.goto(invoicePath);
    const payments = page.getByRole("region", { name: "Payments" });
    await expect(payments.getByRole("listitem")).toHaveCount(1);
    await expect(payments).toContainText("$750.00 paid by card");
    // A card payment can't be undone from the page.
    await expect(
      page.getByRole("button", { name: "Mark as unpaid" }),
    ).toHaveCount(0);

    await page.goto("/dashboard");
    await expect(page.getByText("$750.00").first()).toBeVisible();
  });
});
