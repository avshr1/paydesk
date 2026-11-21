import { expect, test, type Page } from "@playwright/test";

// Everything a mouse user can do, a keyboard user must be able to do too,
// and they must always be able to see where focus is.

// Is the focused element showing a focus indicator (outline or ring), and
// is it inside the page's main content?
async function focusIsVisible(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) {
      return { visible: false, inMain: false, what: "body" };
    }
    const style = getComputedStyle(el);
    const outline =
      style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
    const ring = style.boxShadow !== "none";
    const what = `${el.tagName.toLowerCase()} "${(
      el.getAttribute("aria-label") ??
      el.textContent ??
      ""
    )
      .trim()
      .slice(0, 30)}"`;
    return {
      visible: outline || ring,
      inMain: Boolean(el.closest("main")),
      what,
    };
  });
}

// Tabs through the page and returns any stops without a visible indicator.
// Fails if it never reaches the main content, so it can't pass vacuously.
async function tabThrough(page: Page, maxStops = 40) {
  // Wait for streamed content: while the loading skeleton shows, only the
  // header is focusable, and the check would pass without testing the page.
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

  const invisible: string[] = [];
  const seen = new Set<string>();
  let reachedMain = false;
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press("Tab");
    const { visible, inMain, what } = await focusIsVisible(page);
    // Past the last element, focus leaves the page: that's the end.
    if (what === "body" || seen.has(what)) break;
    seen.add(what);
    reachedMain ||= inMain;
    if (!visible) invisible.push(what);
  }
  expect(
    reachedMain,
    `Tab never reached the main content of ${page.url()}`,
  ).toBe(true);
  return invisible;
}

async function signUpWithKeyboard(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Name").focus();
  await page.keyboard.type("Kay Board");
  await page.keyboard.press("Tab");
  await page.keyboard.type(email);
  await page.keyboard.press("Tab");
  await page.keyboard.type("keyboard-password-123");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("the main journey works with the keyboard alone", async ({ page }) => {
  await signUpWithKeyboard(page, `kb-${Date.now()}@paydesk.test`);

  // Skip link: on a freshly loaded page, the first Tab stop jumps straight
  // to the content. (After an in-app redirect, focus stays where it was.)
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();

  // Add a client without the mouse.
  await page.goto("/clients/new");
  await page.getByLabel("Name").focus();
  await page.keyboard.type("Grace Hopper");
  await page.keyboard.press("Tab");
  await page.keyboard.type("grace@example.com");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/clients$/);

  // Open that client from the list with Enter.
  await page.getByRole("link", { name: /Grace Hopper/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/clients\/[^/]+$/);
});

test.describe("every Tab stop shows where focus is", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });

      for (const path of ["/", "/login", "/signup"]) {
        await page.goto(path);
        expect(await tabThrough(page), path).toEqual([]);
      }

      await signUpWithKeyboard(
        page,
        `kb-${colorScheme}-${Date.now()}@paydesk.test`,
      );

      // Some data, so the dashboard has its chart and lists to tab through.
      await page.goto("/clients/new");
      await page.getByLabel("Name").fill("Grace Hopper");
      await page.getByLabel("Email").fill("grace@example.com");
      await page.getByRole("button", { name: "Add client" }).click();
      await expect(page).toHaveURL(/\/clients$/);
      await page.goto("/invoices/new");
      await page.getByLabel("Line 1 description").fill("Design work");
      await page.getByLabel("Line 1 unit price").fill("100");
      await page.getByRole("button", { name: "Create invoice" }).click();
      await expect(page).toHaveURL(/\/invoices\/(?!new$)[^/]+$/);
      const invoicePath = new URL(page.url()).pathname;

      for (const path of [
        "/dashboard",
        "/clients",
        "/clients/new",
        "/invoices",
        "/invoices/new",
        invoicePath,
      ]) {
        await page.goto(path);
        expect(await tabThrough(page, 80), path).toEqual([]);
      }
    });
  }
});
