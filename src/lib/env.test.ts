import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "postgresql://paydesk:paydesk@localhost:5432/paydesk",
};

describe("parseEnv", () => {
  it("accepts a valid environment and applies defaults", () => {
    const env = parseEnv(valid);

    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.NODE_ENV).toBe("development");
  });

  it("uses Vercel's production domain when APP_URL isn't set", () => {
    const env = parseEnv({
      ...valid,
      VERCEL_PROJECT_PRODUCTION_URL: "paydesk.example.com",
    });

    expect(env.APP_URL).toBe("https://paydesk.example.com");
  });

  it("prefers an explicit APP_URL over Vercel's domain", () => {
    const env = parseEnv({
      ...valid,
      APP_URL: "https://my-domain.example",
      VERCEL_PROJECT_PRODUCTION_URL: "paydesk.example.com",
    });

    expect(env.APP_URL).toBe("https://my-domain.example");
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("rejects a DATABASE_URL that is not a URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "not-a-url" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: "staging" })).toThrow(
      /NODE_ENV/,
    );
  });
});
