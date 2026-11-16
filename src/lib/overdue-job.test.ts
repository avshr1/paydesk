import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  emailConfigured: true,
  updateMany: vi.fn(),
  findMany: vi.fn(),
  logCreate: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    invoice: { updateMany: mocks.updateMany, findMany: mocks.findMany },
    emailLog: { create: mocks.logCreate },
  },
}));
vi.mock("@/lib/email", () => ({
  get isEmailConfigured() {
    return mocks.emailConfigured;
  },
  sendEmail: mocks.sendEmail,
}));

const { runOverdueJob } = await import("@/lib/overdue-job");

const now = new Date("2026-11-20T12:00:00Z");

function lateInvoice(id: string) {
  return {
    id,
    number: `INV-${id}`,
    status: "OVERDUE",
    publicToken: `tok_${id}`,
    totalCents: 10000,
    currency: "usd",
    dueDate: new Date("2026-11-10T00:00:00Z"),
    lastReminderAt: null,
    reminderCount: 0,
    client: { name: "Client", email: `${id}@example.com` },
    user: { name: "Freelancer", email: "me@example.com" },
  };
}

describe("runOverdueJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.emailConfigured = true;
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.logCreate.mockResolvedValue({});
    mocks.findMany.mockResolvedValue([]);
  });

  it("marks SENT invoices past their due date as OVERDUE", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 2 });

    const result = await runOverdueJob(now);

    expect(result.markedOverdue).toBe(2);
    expect(mocks.updateMany.mock.calls[0]?.[0]).toEqual({
      where: {
        status: "SENT",
        dueDate: { lte: new Date("2026-11-19T12:00:00Z") },
      },
      data: { status: "OVERDUE" },
    });
  });

  it("sends a reminder, logs it, and keeps the claim", async () => {
    mocks.findMany.mockResolvedValue([lateInvoice("a")]);
    mocks.sendEmail.mockResolvedValue({ ok: true, id: "email_1" });

    const result = await runOverdueJob(now);

    expect(result).toMatchObject({ remindersSent: 1, remindersFailed: 0 });
    const message = mocks.sendEmail.mock.calls[0]?.[0];
    expect(message.to).toBe("a@example.com");
    expect(message.text).toContain("10 days overdue");
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "a", reminderCount: 0 },
      data: { lastReminderAt: now, reminderCount: { increment: 1 } },
    });
    expect(mocks.logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "REMINDER", status: "SENT" }),
    });
    // Mark overdue + claim, and no undo.
    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
  });

  it("keeps going when one email fails, and undoes that claim", async () => {
    mocks.findMany.mockResolvedValue([lateInvoice("a"), lateInvoice("b")]);
    mocks.sendEmail
      .mockResolvedValueOnce({ ok: false, error: "Mailbox full" })
      .mockResolvedValueOnce({ ok: true, id: "email_2" });

    const result = await runOverdueJob(now);

    expect(result).toMatchObject({ remindersSent: 1, remindersFailed: 1 });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "a", lastReminderAt: now },
      data: { lastReminderAt: null, reminderCount: 0 },
    });
    expect(mocks.logCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "FAILED",
        error: "Mailbox full",
      }),
    });
  });

  it("skips an invoice another run already claimed", async () => {
    mocks.findMany.mockResolvedValue([lateInvoice("a")]);
    mocks.updateMany
      .mockResolvedValueOnce({ count: 0 }) // mark overdue
      .mockResolvedValueOnce({ count: 0 }); // claim lost

    const result = await runOverdueJob(now);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(result.remindersSent).toBe(0);
  });

  it("doesn't undo a sent reminder if logging it fails", async () => {
    mocks.findMany.mockResolvedValue([lateInvoice("a")]);
    mocks.sendEmail.mockResolvedValue({ ok: true, id: "email_1" });
    mocks.logCreate.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await runOverdueJob(now);

    expect(result.remindersSent).toBe(1);
    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
  });

  it("only marks overdue when email isn't set up", async () => {
    mocks.emailConfigured = false;

    const result = await runOverdueJob(now);

    expect(result.emailConfigured).toBe(false);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
