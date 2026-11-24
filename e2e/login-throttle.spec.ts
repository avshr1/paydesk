import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "throttle-password-123";

async function tryLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

function alert(page: Page) {
  // Scoped to <main>: Next.js adds its own role="alert" route announcer.
  return page.getByRole("main").getByRole("alert");
}

test("five wrong passwords lock the email out, even with the right one", async ({
  page,
}) => {
  const email = `throttle-${Date.now()}@paydesk.test`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Theo Throttle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // Let the dashboard's background requests finish first: a late response
  // refreshes the session cookie and would log the user back in.
  await page.waitForLoadState("networkidle");
  await page.context().clearCookies();

  for (let attempt = 1; attempt <= 5; attempt++) {
    await tryLogin(page, email, `wrong-guess-${attempt}`);
    await expect(alert(page)).toHaveText("Incorrect email or password.");
  }

  await tryLogin(page, email, PASSWORD);
  await expect(alert(page)).toHaveText(
    "Too many failed attempts. Try again in 15 minutes.",
  );
  await expect(page).toHaveURL(/\/login$/);
});

test("emails without an account are limited the same way", async ({ page }) => {
  const email = `nobody-${Date.now()}@paydesk.test`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    await tryLogin(page, email, `guess-${attempt}`);
    await expect(alert(page)).toHaveText("Incorrect email or password.");
  }
  await tryLogin(page, email, "guess-6");
  await expect(alert(page)).toHaveText(
    "Too many failed attempts. Try again in 15 minutes.",
  );
});
