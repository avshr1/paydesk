import { describe, expect, it } from "vitest";
import { isValidId } from "@/lib/validation/id";

describe("isValidId", () => {
  it("accepts database IDs", () => {
    expect(isValidId("cmw15o3s50000bwrh9lr15527")).toBe(true);
    expect(isValidId("inv_test")).toBe(true);
  });

  it.each([
    ["an empty string", ""],
    ["a number", 42],
    ["an object", { id: "x" }],
    ["null", null],
    ["a path", "../etc"],
    ["something too long", "a".repeat(65)],
  ])("rejects %s", (_label, value) => {
    expect(isValidId(value)).toBe(false);
  });
});
