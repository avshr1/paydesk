// Runs database migrations as part of the build, but only on Vercel, where
// the build is the one step that runs before each deploy goes live.
// Locally and in CI, `npm run build` never touches a database (CI applies
// migrations in its own step). If a migration fails, the build fails and the
// previous deployment stays live.
import { spawnSync } from "node:child_process";

if (process.env.VERCEL !== "1") {
  console.log("Not on Vercel: skipping prisma migrate deploy.");
  process.exit(0);
}

console.log("On Vercel: applying database migrations.");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
