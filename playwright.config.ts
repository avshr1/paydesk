import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// End-to-end tests run against a production build (`npm run build` first) and
// a real database from DATABASE_URL. See README → Testing.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_URL: `http://localhost:${PORT}`,
      APP_URL: `http://localhost:${PORT}`,
      // A fixed secret is fine here: it only signs sessions in this test run.
      AUTH_SECRET:
        process.env.AUTH_SECRET ??
        "e2e-only-secret-not-used-anywhere-else-0000",
    },
  },
});
