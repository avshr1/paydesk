import { expect, test } from "@playwright/test";

// One journey through the app as a brand-new freelancer. A unique email per
// run keeps reruns against the same database independent.
test("sign up, add a client, create an invoice, and try to send it", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}-${test.info().workerIndex}@paydesk.test`;

  await test.step("sign up", async () => {
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Edie Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("e2e-password-123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Welcome, Edie" }),
    ).toBeVisible();
    await expect(page.getByText("No invoices yet")).toBeVisible();
  });

  await test.step("add a client", async () => {
    await page.getByRole("link", { name: "Clients", exact: true }).click();
    await expect(page.getByText("No clients yet")).toBeVisible();
    await page.getByRole("link", { name: "Add client" }).click();

    await page.getByLabel("Name").fill("Grace Hopper");
    await page.getByLabel("Email").fill("grace@example.com");
    await page.getByLabel("Company (optional)").fill("Navy Labs");
    await page.getByRole("button", { name: "Add client" }).click();

    await expect(page).toHaveURL(/\/clients$/);
    await expect(page.getByText("Grace Hopper")).toBeVisible();
  });

  await test.step("create an invoice with live totals", async () => {
    await page.getByRole("link", { name: "Invoices", exact: true }).click();
    await page.getByRole("link", { name: "New invoice" }).click();

    // The only client is preselected.
    await expect(page.getByLabel("Client")).toHaveValue(/.+/);
    await page.getByLabel("Tax rate (%)").fill("8.25");
    await page.getByLabel("Line 1 description").fill("Website design");
    await page.getByLabel("Line 1 quantity").fill("10");
    await page.getByLabel("Line 1 unit price").fill("75");
    await page.getByRole("button", { name: "+ Add line item" }).click();
    await page.getByLabel("Line 2 description").fill("Hosting (annual)");
    await page.getByLabel("Line 2 unit price").fill("120");

    // The browser preview, before saving.
    await expect(page.getByText("$941.78")).toBeVisible();
    await page.getByRole("button", { name: "Create invoice" }).click();

    // The server's own totals, after saving.
    await expect(page).toHaveURL(/\/invoices\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "INV-0001" })).toBeVisible();
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByText("$941.78")).toBeVisible();
  });

  await test.step("download the PDF", async () => {
    const href = await page
      .getByRole("link", { name: "Download PDF" })
      .getAttribute("href");
    const response = await page.request.get(href ?? "");

    expect(response.headers()["content-disposition"]).toContain(
      'filename="INV-0001.pdf"',
    );
    expect((await response.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  await test.step("sending reports that email isn't set up", async () => {
    test.skip(
      Boolean(process.env.RESEND_API_KEY),
      "Email is configured; don't send real email from tests.",
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Send invoice" }).click();

    // Scoped to <main>: Next.js adds its own role="alert" route announcer.
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Email isn't set up yet. Add RESEND_API_KEY and EMAIL_FROM.",
    );
    // Still a draft, so it can be fixed and resent.
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit draft" })).toBeVisible();
  });
});
