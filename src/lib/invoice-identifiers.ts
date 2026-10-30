import { randomBytes } from "node:crypto";

const NUMBER_PREFIX = "INV-";

export function formatInvoiceNumber(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError(
      `Invoice sequence must be a positive integer, got ${sequence}`,
    );
  }
  return `${NUMBER_PREFIX}${String(sequence).padStart(4, "0")}`;
}

// Given the user's most recent invoice number (or null for their first
// invoice), returns the next one: INV-0041 → INV-0042, INV-9999 → INV-10000.
export function nextInvoiceNumber(latest: string | null): string {
  if (latest === null) return formatInvoiceNumber(1);

  const match = /^INV-(\d+)$/.exec(latest);
  if (!match) throw new Error(`Unrecognized invoice number: ${latest}`);
  return formatInvoiceNumber(Number(match[1]) + 1);
}

// 32 random bytes (256 bits), URL-safe, for public links like /i/{token}.
// Impossible to guess, unlike a database ID. See docs/decisions.md #4.
export function generatePublicToken(): string {
  return randomBytes(32).toString("base64url");
}
