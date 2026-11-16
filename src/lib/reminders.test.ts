import { describe, expect, it } from "vitest";
import {
  daysOverdue,
  isReminderDue,
  lastReminderCutoff,
  MAX_REMINDERS,
  type ReminderCandidate,
} from "@/lib/reminders";

const now = new Date("2026-11-20T12:00:00Z");

const late: ReminderCandidate = {
  status: "SENT",
  dueDate: new Date("2026-11-10T00:00:00Z"),
  lastReminderAt: null,
  reminderCount: 0,
};

describe("isReminderDue", () => {
  it("reminds a late, unpaid invoice that hasn't been reminded", () => {
    expect(isReminderDue(late, now)).toBe(true);
    expect(isReminderDue({ ...late, status: "OVERDUE" }, now)).toBe(true);
  });

  it("never reminds drafts or paid invoices", () => {
    expect(isReminderDue({ ...late, status: "DRAFT" }, now)).toBe(false);
    expect(isReminderDue({ ...late, status: "PAID" }, now)).toBe(false);
  });

  it("waits until the day after the due date", () => {
    const dueToday = { ...late, dueDate: new Date("2026-11-20T00:00:00Z") };
    expect(isReminderDue(dueToday, now)).toBe(false);
  });

  it("sends at most one reminder a week", () => {
    const sixDaysAgo = new Date("2026-11-14T12:00:00Z");
    const sevenDaysAgo = new Date("2026-11-13T12:00:00Z");

    expect(isReminderDue({ ...late, lastReminderAt: sixDaysAgo }, now)).toBe(
      false,
    );
    expect(isReminderDue({ ...late, lastReminderAt: sevenDaysAgo }, now)).toBe(
      true,
    );
  });

  it("stops after the maximum number of reminders", () => {
    expect(
      isReminderDue({ ...late, reminderCount: MAX_REMINDERS - 1 }, now),
    ).toBe(true);
    expect(isReminderDue({ ...late, reminderCount: MAX_REMINDERS }, now)).toBe(
      false,
    );
  });
});

describe("lastReminderCutoff", () => {
  it("is seven days before now", () => {
    expect(lastReminderCutoff(now)).toEqual(new Date("2026-11-13T12:00:00Z"));
  });
});

describe("daysOverdue", () => {
  it("counts whole days since the due date", () => {
    expect(daysOverdue(late.dueDate, now)).toBe(10);
    expect(daysOverdue(new Date("2026-12-01T00:00:00Z"), now)).toBe(0);
  });
});
