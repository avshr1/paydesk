// All money is integers: amounts in cents, tax rates in basis points
// (825 = 8.25%), and quantities in hundredths (150 = 1.5). See docs/decisions.md.

export type LineItemInput = {
  quantityHundredths: number;
  unitPriceCents: number;
};

export type InvoiceTotals = {
  lineAmountsCents: number[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

function assertNonNegativeInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `${name} must be a non-negative integer, got ${value}`,
    );
  }
}

// Integer division rounded half up, with no floating-point math.
function divideRounded(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

export function lineAmountCents({
  quantityHundredths,
  unitPriceCents,
}: LineItemInput): number {
  assertNonNegativeInteger(quantityHundredths, "quantityHundredths");
  assertNonNegativeInteger(unitPriceCents, "unitPriceCents");
  return divideRounded(quantityHundredths * unitPriceCents, 100);
}

export function calculateTotals(
  lineItems: LineItemInput[],
  taxRateBps: number,
): InvoiceTotals {
  assertNonNegativeInteger(taxRateBps, "taxRateBps");

  const lineAmountsCents = lineItems.map(lineAmountCents);
  const subtotalCents = lineAmountsCents.reduce((sum, cents) => sum + cents, 0);
  const taxCents = divideRounded(subtotalCents * taxRateBps, 10_000);
  const totalCents = subtotalCents + taxCents;

  if (!Number.isSafeInteger(totalCents)) {
    throw new RangeError("Invoice total is too large");
  }

  return { lineAmountsCents, subtotalCents, taxCents, totalCents };
}

// Parses a user-typed amount like "12", "12.5", or "1,234.56" into an integer
// number of hundredths (cents for money, hundredths for quantities).
export function parseHundredths(input: string): number | null {
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(
    input.trim().replaceAll(",", ""),
  );
  if (!match) return null;

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  return whole * 100 + fraction;
}

export function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
