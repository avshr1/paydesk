// Read-only checks against a running deployment:
//   BASE_URL=https://paydesk-theta.vercel.app node scripts/smoke-test.mjs
// With EXPECT_VERSION set (a commit SHA), it first waits up to 10 minutes for
// that commit to be live. It never logs in or writes any data.
import { randomBytes } from "node:crypto";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const EXPECT_VERSION = process.env.EXPECT_VERSION?.slice(0, 7);

const url = (path) => new URL(path, BASE_URL).toString();
const get = (path, init) =>
  fetch(url(path), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    ...init,
  });

async function waitForVersion() {
  const deadline = Date.now() + 10 * 60 * 1000;
  let last = "no response";
  while (Date.now() < deadline) {
    try {
      const body = await (await get("/api/health")).json();
      last = body.version;
      if (body.version === EXPECT_VERSION) return;
    } catch (error) {
      last = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
  throw new Error(`${EXPECT_VERSION} never went live (last seen: ${last})`);
}

const unknownToken = randomBytes(32).toString("base64url");

const checks = [
  [
    "health check passes (database has its tables)",
    async () => {
      const res = await get("/api/health");
      const body = await res.json();
      return (
        res.status === 200 && body.status === "ok" && body.database === "ok"
      );
    },
  ],
  ["login page loads", async () => (await get("/login")).status === 200],
  [
    "dashboard sends logged-out visitors to login",
    async () => {
      const res = await get("/dashboard");
      return (
        res.status >= 300 &&
        res.status < 400 &&
        (res.headers.get("location") ?? "").endsWith("/login")
      );
    },
  ],
  // These query the database, so a 500 here means a broken schema.
  [
    "unknown invoice link returns 404",
    async () => (await get(`/i/${unknownToken}`)).status === 404,
  ],
  [
    "unknown invoice PDF returns 404",
    async () => (await get(`/i/${unknownToken}/pdf`)).status === 404,
  ],
  [
    "Stripe webhook rejects unsigned requests",
    async () => {
      const { status } = await get("/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      });
      return status === 400 || status === 503; // 503: Stripe not set up yet
    },
  ],
  [
    "daily job rejects requests without the secret",
    async () => {
      const { status } = await get("/api/cron/overdue");
      return status === 401 || status === 503; // 503: CRON_SECRET not set yet
    },
  ],
];

if (EXPECT_VERSION) {
  console.log(`Waiting for ${EXPECT_VERSION} to be live at ${BASE_URL}…`);
  await waitForVersion();
}

let failed = 0;
for (const [name, check] of checks) {
  let ok = false;
  try {
    ok = await check();
  } catch (error) {
    console.error(`  ${name}: ${error}`);
  }
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failed++;
}
console.log(failed ? `${failed} check(s) failed` : "All checks passed");
process.exit(failed ? 1 : 0);
