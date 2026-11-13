import { notFound } from "next/navigation";
import { z } from "zod";

// IDs reach Server Actions from the browser, so check their shape before
// they reach the database. Ownership is still enforced by every query.
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export function isValidId(value: unknown): value is string {
  return idSchema.safeParse(value).success;
}

// A malformed ID is treated like an unknown one: 404, not a server error.
export function assertId(value: unknown): asserts value is string {
  if (!isValidId(value)) notFound();
}
