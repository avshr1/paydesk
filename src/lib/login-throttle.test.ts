import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    loginAttempt: {
      count: mocks.count,
      create: mocks.create,
      deleteMany: mocks.deleteMany,
    },
  },
}));

const {
  isLoginThrottled,
  MAX_FAILURES,
  pruneLoginAttempts,
  recordLoginFailure,
  windowStart,
} = await import("@/lib/login-throttle");

const now = new Date("2026-11-24T12:00:00Z");

describe("login throttling", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows logins below the failure limit", async () => {
    mocks.count.mockResolvedValue(MAX_FAILURES - 1);

    expect(await isLoginThrottled("ada@example.com", now)).toBe(false);
  });

  it("refuses logins once the limit is reached", async () => {
    mocks.count.mockResolvedValue(MAX_FAILURES);

    expect(await isLoginThrottled("ada@example.com", now)).toBe(true);
  });

  it("only counts failures for that email within the last 15 minutes", async () => {
    mocks.count.mockResolvedValue(0);

    await isLoginThrottled("ada@example.com", now);

    expect(windowStart(now)).toEqual(new Date("2026-11-24T11:45:00Z"));
    expect(mocks.count).toHaveBeenCalledWith({
      where: {
        email: "ada@example.com",
        createdAt: { gte: new Date("2026-11-24T11:45:00Z") },
      },
    });
  });

  it("records a failure for the email", async () => {
    await recordLoginFailure("ada@example.com");

    expect(mocks.create).toHaveBeenCalledWith({
      data: { email: "ada@example.com" },
    });
  });

  it("prunes failures older than a day", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 3 });

    expect(await pruneLoginAttempts(now)).toBe(3);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date("2026-11-23T12:00:00Z") } },
    });
  });
});
