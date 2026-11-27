import { InvoiceStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { isPastDue } from "@/lib/invoice-status";

// For payments received outside Paydesk (bank transfer, check, cash). Only
// sent invoices can be marked paid; drafts haven't been billed yet.
export async function markInvoicePaid(
  userId: string,
  invoiceId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const { count } = await db.invoice.updateMany({
    where: {
      id: invoiceId,
      userId,
      status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
    },
    data: { status: InvoiceStatus.PAID, paidAt: now },
  });
  return count === 1;
}

export type UnpaidResult = "done" | "not_found" | "has_card_payment";

// Undoes a manual "mark as paid". Refused when Stripe recorded a card
// payment, so a real payment can't be erased by mistake.
export async function markInvoiceUnpaid(
  userId: string,
  invoiceId: string,
  now: Date = new Date(),
): Promise<UnpaidResult> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, userId, status: InvoiceStatus.PAID },
    select: { dueDate: true, _count: { select: { payments: true } } },
  });
  if (!invoice) return "not_found";
  if (invoice._count.payments > 0) return "has_card_payment";

  const { count } = await db.invoice.updateMany({
    where: { id: invoiceId, userId, status: InvoiceStatus.PAID },
    data: {
      status: isPastDue(invoice.dueDate, now)
        ? InvoiceStatus.OVERDUE
        : InvoiceStatus.SENT,
      paidAt: null,
    },
  });
  return count === 1 ? "done" : "not_found";
}
