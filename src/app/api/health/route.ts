import { db } from "@/lib/db";

// The deployed commit, from Vercel's system environment variables, so the
// post-deploy smoke test can tell when a push has gone live.
function version() {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
}

export async function GET() {
  try {
    // Query a real table, not just `SELECT 1`: a reachable database with no
    // migrations applied must not report healthy.
    await db.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    return Response.json({ status: "ok", database: "ok", version: version() });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json(
      { status: "error", database: "unavailable", version: version() },
      { status: 503 },
    );
  }
}
