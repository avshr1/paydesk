import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { pruneLoginAttempts } from "@/lib/login-throttle";
import { runOverdueJob } from "@/lib/overdue-job";

// Compares hashes so the check takes the same time whatever is sent, and
// doesn't leak the secret's length.
function matchesSecret(header: string | null, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}

// Called once a day by Vercel Cron (see vercel.json), which sends
// "Authorization: Bearer <CRON_SECRET>". Nobody else can trigger it.
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  if (!matchesSecret(request.headers.get("authorization"), env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runOverdueJob();
  // Daily housekeeping: failed-login records only matter for 15 minutes.
  const loginAttemptsPruned = await pruneLoginAttempts();
  console.log("Daily job finished", { ...result, loginAttemptsPruned });
  return Response.json({ ...result, loginAttemptsPruned });
}
