import { InvoiceStatus } from "@/generated/prisma/enums";
import { isPastDue } from "@/lib/invoice-status";

// Clients get at most one reminder a week, and at most three in total.
export const REMINDER_INTERVAL_DAYS = 7;
export const MAX_REMINDERS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReminderCandidate = {
  status: InvoiceStatus;
  dueDate: Date;
  lastReminderAt: Date | null;
  reminderCount: number;
};

// Who gets a reminder today? Unpaid, past due, not reminded in the last
// week, and under the cap.
export function isReminderDue(
  invoice: ReminderCandidate,
  now: Date = new Date(),
): boolean {
  const unpaid =
    invoice.status === InvoiceStatus.SENT ||
    invoice.status === InvoiceStatus.OVERDUE;
  const remindedRecently =
    invoice.lastReminderAt !== null &&
    now.getTime() - invoice.lastReminderAt.getTime() <
      REMINDER_INTERVAL_DAYS * DAY_MS;

  return (
    unpaid &&
    isPastDue(invoice.dueDate, now) &&
    !remindedRecently &&
    invoice.reminderCount < MAX_REMINDERS
  );
}

// The database version of "not reminded in the last week", for queries.
export function lastReminderCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - REMINDER_INTERVAL_DAYS * DAY_MS);
}

// Whole days late, counting from the end of the due date.
export function daysOverdue(dueDate: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / DAY_MS));
}
