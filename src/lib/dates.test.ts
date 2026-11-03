import { describe, expect, it } from "vitest";
import { formatDate, parseDateOnly, toDateInputValue } from "@/lib/dates";

describe("dates", () => {
  it("round-trips a calendar day", () => {
    expect(toDateInputValue(parseDateOnly("2026-11-15"))).toBe("2026-11-15");
  });

  it("formats in UTC so the day never shifts", () => {
    expect(formatDate(parseDateOnly("2026-01-01"))).toBe("Jan 1, 2026");
  });
});
