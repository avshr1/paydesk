import { describe, expect, it } from "vitest";
import { clientSchema } from "@/lib/validation/client";

describe("clientSchema", () => {
  it("accepts a valid client and normalizes it", () => {
    const result = clientSchema.parse({
      name: "  Ada Lovelace ",
      email: " ADA@Example.com ",
      company: "Analytical Engines",
      address: "",
      notes: "   ",
    });

    expect(result).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      address: undefined,
      notes: undefined,
    });
  });

  it("only requires name and email", () => {
    expect(
      clientSchema.safeParse({ name: "Ada", email: "ada@example.com" }).success,
    ).toBe(true);
  });

  it("requires a name", () => {
    const result = clientSchema.safeParse({
      name: "   ",
      email: "ada@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Name is required");
  });

  it("rejects an invalid email", () => {
    const result = clientSchema.safeParse({
      name: "Ada",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Enter a valid email address",
    );
  });

  it("rejects notes that are too long", () => {
    const result = clientSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      notes: "x".repeat(2001),
    });

    expect(result.success).toBe(false);
  });
});
