import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  secret: "a-long-test-secret-0123456789" as string | undefined,
  runOverdueJob: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    get CRON_SECRET() {
      return mocks.secret;
    },
  },
}));
vi.mock("@/lib/overdue-job", () => ({ runOverdueJob: mocks.runOverdueJob }));

const { GET } = await import("./route");

function request(authorization?: string) {
  return new Request("http://localhost/api/cron/overdue", {
    headers: authorization ? { authorization } : {},
  });
}

describe("GET /api/cron/overdue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.secret = "a-long-test-secret-0123456789";
    mocks.runOverdueJob.mockResolvedValue({ markedOverdue: 0 });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("runs the job with the right secret", async () => {
    const res = await GET(request("Bearer a-long-test-secret-0123456789"));

    expect(res.status).toBe(200);
    expect(mocks.runOverdueJob).toHaveBeenCalledOnce();
  });

  it.each([
    ["no header", undefined],
    ["a wrong secret", "Bearer wrong"],
    ["the secret without Bearer", "a-long-test-secret-0123456789"],
  ])("rejects %s", async (_label, header) => {
    const res = await GET(request(header));

    expect(res.status).toBe(401);
    expect(mocks.runOverdueJob).not.toHaveBeenCalled();
  });

  it("refuses to run when no secret is configured", async () => {
    mocks.secret = undefined;

    const res = await GET(request("Bearer "));

    expect(res.status).toBe(503);
    expect(mocks.runOverdueJob).not.toHaveBeenCalled();
  });
});
