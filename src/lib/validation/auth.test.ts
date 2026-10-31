import { describe, expect, it } from "vitest";
import { logInSchema, signUpSchema } from "@/lib/validation/auth";

const valid = {
  name: "Ada Lovelace",
  email: " ADA@example.com ",
  password: "correct horse battery",
};

function firstMessage(input: unknown) {
  const result = signUpSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.message;
}

describe("signUpSchema", () => {
  it("accepts a valid sign-up and normalizes the email", () => {
    expect(signUpSchema.parse(valid)).toEqual({
      ...valid,
      email: "ada@example.com",
    });
  });

  it("requires a name", () => {
    expect(firstMessage({ ...valid, name: " " })).toBe("Name is required");
  });

  it("rejects an invalid email", () => {
    expect(firstMessage({ ...valid, email: "ada" })).toBe(
      "Enter a valid email address",
    );
  });

  it("requires at least 8 characters", () => {
    expect(firstMessage({ ...valid, password: "short" })).toBe(
      "Password must be at least 8 characters",
    );
  });

  it("rejects passwords longer than bcrypt supports", () => {
    expect(firstMessage({ ...valid, password: "a".repeat(73) })).toBe(
      "Password is too long",
    );
    // 24 emoji × 4 bytes = 96 bytes, even though it's only 24 characters
    expect(firstMessage({ ...valid, password: "🔒".repeat(24) })).toBe(
      "Password is too long",
    );
  });
});

describe("logInSchema", () => {
  it("requires a password", () => {
    const result = logInSchema.safeParse({
      email: "ada@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Password is required");
  });
});
