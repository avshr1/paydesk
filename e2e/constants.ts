// Shared by playwright.config.ts (the app under test) and the tests that sign
// fake Stripe webhooks. Test-only: it verifies nothing outside a test run.
export const E2E_WEBHOOK_SECRET = "whsec_e2e_only_not_a_real_secret";
