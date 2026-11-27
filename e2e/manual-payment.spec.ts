import { expect, test } from "@playwright/test";
import pg from "pg";

// A client paid by bank transfer: the freelancer marks the invoice paid by
// hand, and can undo it.
test("mark an overdue invoice paid by hand, then undo it", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL, "Needs DATABASE_URL to set up data");

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Manny Manual");
  await page.getByLabel("Email").fill(`manual-${Date.now()}@paydesk.test`);
  await page.getByLabel("Password").fill("manual-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/clients/new");
  await page.getByLabel("Name").fill("Grace Hopper");
  await page.getByLabel("Email").fill("grace@example.com");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page).toHaveURL(/\/clients$/);

  await page.goto("/invoices/new");
  await page.getByLabel("Line 1 description").fill("Consulting");
  await page.getByLabel("Line 1 unit price").fill("640");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page).toHaveURL(/\/invoices\/(?!new$)[^/]+$/);
  const invoicePath = new URL(page.url()).pathname;

  // Sending needs email, which tests don't have: mark it sent and overdue.
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  await db.query(
    `UPDATE "Invoice" SET status = 'OVERDUE', "sentAt" = now(),
       "dueDate" = now() - interval '10 days' WHERE id = $1`,
    [invoicePath.split("/").pop()],
  );
  await db.end();

  page.on("dialog", (dialog) => dialog.accept());
  const status = page.locator("main h1 + span");

  await page.goto(invoicePath);
  await expect(status).toHaveText("Overdue");
  await page.getByRole("button", { name: "Mark as paid" }).click();
  await expect(status).toHaveText("Paid");
  await expect(page.getByRole("button", { name: "Mark as paid" })).toHaveCount(
    0,
  );

  await page.goto("/dashboard");
  await expect(page.getByText("$640.00").first()).toBeVisible();

  // Undo: it was past due, so it goes back to Overdue, not Sent.
  await page.goto(invoicePath);
  await page.getByRole("button", { name: "Mark as unpaid" }).click();
  await expect(status).toHaveText("Overdue");
  await expect(
    page.getByRole("button", { name: "Mark as paid" }),
  ).toBeVisible();
});
