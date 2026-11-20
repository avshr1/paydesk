// A y-axis for money charts: gridlines at round amounts (1, 2, or 5 × a
// power of ten), with about four steps up to just above the largest value.
export function niceAxis(maxCents: number): { max: number; ticks: number[] } {
  if (maxCents <= 0)
    return { max: 10_000, ticks: [0, 2_500, 5_000, 7_500, 10_000] };

  const rough = maxCents / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const max = Math.ceil(maxCents / step) * step;
  const ticks = Array.from(
    { length: Math.round(max / step) + 1 },
    (_, index) => index * step,
  );
  return { max, ticks };
}

// "$750", "$1.5k", "$12k".
export function axisLabel(cents: number): string {
  const dollars = cents / 100;
  return dollars >= 1000
    ? `$${(dollars / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`
    : `$${dollars.toLocaleString("en-US")}`;
}
