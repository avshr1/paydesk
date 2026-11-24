import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.fn();
vi.mock("@/lib/db", () => ({ db: { $queryRaw: queryRaw } }));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("returns ok when the database responds", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "ok",
      database: "ok",
      version: "dev",
    });
  });

  it("reports the deployed commit on Vercel", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "26adb42c0ffee");

    const res = await GET();

    expect(await res.json()).toMatchObject({ version: "26adb42" });
    vi.unstubAllEnvs();
  });

  it("returns 503 when the database is unreachable", async () => {
    queryRaw.mockRejectedValue(new Error("connection refused"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      status: "error",
      database: "unavailable",
      version: "dev",
    });
  });
});
