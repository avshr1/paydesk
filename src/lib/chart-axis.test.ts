import { describe, expect, it } from "vitest";
import { axisLabel, niceAxis } from "@/lib/chart-axis";

const labels = (maxCents: number) => niceAxis(maxCents).ticks.map(axisLabel);

describe("niceAxis", () => {
  it("puts gridlines at round amounts", () => {
    // The demo's largest month, $2,760.38, once produced "$2.3k" (really $2,250).
    expect(labels(276_038)).toEqual(["$0", "$1k", "$2k", "$3k"]);
    expect(labels(50_000)).toEqual(["$0", "$200", "$400", "$600"]);
    expect(labels(1_234_567)).toEqual(["$0", "$5k", "$10k", "$15k"]);
  });

  it("always reaches above the largest value", () => {
    for (const cents of [1, 99, 276_038, 1_000_000, 987_654_321]) {
      expect(niceAxis(cents).max).toBeGreaterThanOrEqual(cents);
    }
  });

  it("uses a $100 axis when there's no revenue yet", () => {
    expect(labels(0)).toEqual(["$0", "$25", "$50", "$75", "$100"]);
  });
});

describe("axisLabel", () => {
  it("shortens thousands", () => {
    expect(axisLabel(150_000)).toBe("$1.5k");
    expect(axisLabel(75_000)).toBe("$750");
  });
});
