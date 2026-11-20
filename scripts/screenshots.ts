// Captures the README screenshots from a running app with demo data:
//   npm run db:seed && npm run build && npm run start
//   npm run screenshots            (BASE_URL defaults to localhost:3000)
import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";

async function shot(page: Page, name: string, path: string) {
  await page.goto(new URL(path, BASE_URL).toString());
  await page.waitForLoadState("networkidle");
  // Never save a picture of an error page into the README.
  if (await page.getByText("Something went wrong").isVisible()) {
    throw new Error(`${path} showed an error page; check the server log`);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`saved ${OUT}/${name}.png`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
  });

  try {
    await page.goto(new URL("/login", BASE_URL).toString());
    await page.getByLabel("Email").fill("demo@paydesk.test");
    await page.getByLabel("Password").fill("demo-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/dashboard$/);
    // Let the post-login dashboard finish loading before requesting it again.
    await page.waitForLoadState("networkidle");

    await shot(page, "dashboard", "/dashboard");
    await shot(page, "invoices", "/invoices");
    await shot(page, "new-invoice", "/invoices/new");

    // An unpaid invoice that has been sent, for its page and client link.
    await page.goto(new URL("/invoices?status=OVERDUE", BASE_URL).toString());
    await page.locator("main ul a").first().click();
    await page.waitForURL(/\/invoices\/[^/]+$/);
    const invoicePath = new URL(page.url()).pathname;
    const publicUrl = await page.locator("main code").first().textContent();
    if (!publicUrl) throw new Error("No client link on the invoice page");

    await shot(page, "invoice", invoicePath);
    await shot(page, "client-view", new URL(publicUrl).pathname);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
