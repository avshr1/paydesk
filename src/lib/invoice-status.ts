import { InvoiceStatus } from "@/generated/prisma/enums";

// Which status changes are allowed. PAID is final.
const transitions: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: [InvoiceStatus.SENT],
  SENT: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE],
  OVERDUE: [InvoiceStatus.PAID],
  PAID: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return transitions[from].includes(to);
}

// Sent invoices are locked so they always match what the client was emailed.
// See docs/decisions.md #5.
export function isEditable(status: InvoiceStatus): boolean {
  return status === InvoiceStatus.DRAFT;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// An invoice is due through the end of its due date (UTC), and overdue after.
export function isPastDue(dueDate: Date, now: Date = new Date()): boolean {
  return now.getTime() >= dueDate.getTime() + DAY_MS;
}

export function shouldMarkOverdue(
  invoice: { status: InvoiceStatus; dueDate: Date },
  now: Date = new Date(),
): boolean {
  return (
    invoice.status === InvoiceStatus.SENT && isPastDue(invoice.dueDate, now)
  );
}
