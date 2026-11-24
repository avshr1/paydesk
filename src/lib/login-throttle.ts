import { db } from "@/lib/db";

// Brute-force protection: after MAX_FAILURES wrong passwords for an email
// within the window, further attempts for that email are refused until the
// oldest failure ages out.
//
// Counting by email (not by whether the account exists) means the limit
// reveals nothing about which emails have accounts. The trade-off: someone
// can lock a real user out for up to WINDOW_MINUTES by guessing wrong.
export const MAX_FAILURES = 5;
export const WINDOW_MINUTES = 15;
// How long failures are kept before the daily job prunes them.
const KEEP_HOURS = 24;

const MINUTE_MS = 60 * 1000;

export function windowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - WINDOW_MINUTES * MINUTE_MS);
}

export async function isLoginThrottled(
  email: string,
  now: Date = new Date(),
): Promise<boolean> {
  const failures = await db.loginAttempt.count({
    where: { email, createdAt: { gte: windowStart(now) } },
  });
  return failures >= MAX_FAILURES;
}

export async function recordLoginFailure(email: string): Promise<void> {
  await db.loginAttempt.create({ data: { email } });
}

export async function pruneLoginAttempts(
  now: Date = new Date(),
): Promise<number> {
  const { count } = await db.loginAttempt.deleteMany({
    where: {
      createdAt: { lt: new Date(now.getTime() - KEEP_HOURS * 60 * MINUTE_MS) },
    },
  });
  return count;
}
