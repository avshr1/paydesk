import { db } from "@/lib/db";

export async function GET() {
  try {
    // Query a real table, not just `SELECT 1`: a reachable database with no
    // migrations applied must not report healthy.
    await db.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    return Response.json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503 },
    );
  }
}
