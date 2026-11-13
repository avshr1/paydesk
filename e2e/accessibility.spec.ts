import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Automated WCAG 2.1 AA checks. They catch missing labels, low contrast, and
// broken ARIA, but not everything: keyboard flow is still checked by hand.
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const summary = violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
  expect(summary).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test("public pages", async ({ page }) => {
      for (const path of ["/", "/login", "/signup"]) {
        await page.goto(path);
        await expectNoViolations(page);
      }
    });

    test("app pages", async ({ page }) => {
      await page.goto("/signup");
      await page.getByLabel("Name").fill("Ally Checker");
      await page
        .getByLabel("Email")
        .fill(`a11y-${Date.now()}-${colorScheme}@paydesk.test`);
      await page.getByLabel("Password").fill("a11y-password-123");
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
      await expectNoViolations(page);

      await page.goto("/clients/new");
      await expectNoViolations(page);
      await page.getByLabel("Name").fill("Grace Hopper");
      await page.getByLabel("Email").fill("grace@example.com");
      await page.getByRole("button", { name: "Add client" }).click();
      await expect(page).toHaveURL(/\/clients$/);
      await expectNoViolations(page);

      await page.goto("/invoices/new");
      await expectNoViolations(page);
      await page.getByLabel("Line 1 description").fill("Design work");
      await page.getByLabel("Line 1 unit price").fill("100");
      await page.getByRole("button", { name: "Create invoice" }).click();
      await expect(page).toHaveURL(/\/invoices\/[^/]+$/);
      await expectNoViolations(page);

      await page.goto("/invoices");
      await expectNoViolations(page);
      await page.goto("/dashboard");
      await expectNoViolations(page);
    });
  });
}
