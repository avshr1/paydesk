import { expect, test } from "@playwright/test";

test.describe("logged-out visitors", () => {
  for (const path of ["/dashboard", "/clients", "/invoices", "/invoices/new"]) {
    test(`are redirected from ${path} to the login page`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
    });
  }

  test("can still open the home page and health check", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Invoicing and payments for freelancers.",
      }),
    ).toBeVisible();

    const health = await request.get("/api/health");
    expect(await health.json()).toEqual({ status: "ok", database: "ok" });
  });
});
