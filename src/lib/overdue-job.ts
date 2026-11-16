import {
  EmailStatus,
  EmailType,
  InvoiceStatus,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { isEmailConfigured, sendEmail, type SendResult } from "@/lib/email";
import { buildReminderEmail } from "@/lib/emails/invoice-email";
import { publicInvoiceUrl } from "@/lib/invoice-delivery";
import { pastDueCutoff } from "@/lib/invoice-status";
import {
  daysOverdue,
  isReminderDue,
  lastReminderCutoff,
  MAX_REMINDERS,
} from "@/lib/reminders";

// Keeps one run well within a serverless time limit; the rest go tomorrow.
const BATCH_SIZE = 50;

export type OverdueJobResult = {
  markedOverdue: number;
  remindersSent: number;
  remindersFailed: number;
  emailConfigured: boolean;
};

// The daily job: mark late invoices OVERDUE, then email reminders.
export async function runOverdueJob(
  now: Date = new Date(),
): Promise<OverdueJobResult> {
  const cutoff = pastDueCutoff(now);

  const marked = await db.invoice.updateMany({
    where: { status: InvoiceStatus.SENT, dueDate: { lte: cutoff } },
    data: { status: InvoiceStatus.OVERDUE },
  });

  const result: OverdueJobResult = {
    markedOverdue: marked.count,
    remindersSent: 0,
    remindersFailed: 0,
    emailConfigured: isEmailConfigured,
  };
  // Without email there's nothing to send, and logging a failure for every
  // late invoice every day would only bury real problems.
  if (!isEmailConfigured) return result;

  const candidates = await db.invoice.findMany({
    where: {
      status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] },
      dueDate: { lte: cutoff },
      reminderCount: { lt: MAX_REMINDERS },
      OR: [
        { lastReminderAt: null },
        { lastReminderAt: { lte: lastReminderCutoff(now) } },
      ],
    },
    orderBy: { dueDate: "asc" },
    take: BATCH_SIZE,
    include: {
      client: { select: { name: true, email: true } },
      user: { select: { name: true, email: true } },
    },
  });

  for (const invoice of candidates) {
    if (!isReminderDue(invoice, now)) continue;

    // Claim the reminder before sending. If another run got here first, the
    // count has changed, nothing matches, and this run skips the invoice.
    const claimed = await db.invoice.updateMany({
      where: { id: invoice.id, reminderCount: invoice.reminderCount },
      data: { lastReminderAt: now, reminderCount: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    const to = invoice.client.email;
    let sent: SendResult;
    try {
      sent = await sendEmail({
        to,
        ...buildReminderEmail({
          invoiceNumber: invoice.number,
          senderName: invoice.user.name ?? invoice.user.email,
          clientName: invoice.client.name,
          totalCents: invoice.totalCents,
          currency: invoice.currency,
          dueDate: invoice.dueDate,
          link: publicInvoiceUrl(invoice.publicToken),
          daysOverdue: daysOverdue(invoice.dueDate, now),
        }),
      });
    } catch (error) {
      console.error(`Reminder for invoice ${invoice.id} failed`, error);
      sent = { ok: false, error: "Unexpected error while sending." };
    }

    // Logging must never undo a reminder that was actually sent.
    await db.emailLog
      .create({
        data: {
          invoiceId: invoice.id,
          type: EmailType.REMINDER,
          to,
          status: sent.ok ? EmailStatus.SENT : EmailStatus.FAILED,
          providerId: sent.ok ? sent.id : null,
          error: sent.ok ? null : sent.error,
        },
      })
      .catch((error: unknown) =>
        console.error(`Couldn't log reminder for ${invoice.id}`, error),
      );

    if (sent.ok) {
      result.remindersSent++;
      continue;
    }

    // Undo the claim so tomorrow's run tries again. One failure never stops
    // the rest of the batch.
    result.remindersFailed++;
    await db.invoice
      .updateMany({
        where: { id: invoice.id, lastReminderAt: now },
        data: {
          lastReminderAt: invoice.lastReminderAt,
          reminderCount: invoice.reminderCount,
        },
      })
      .catch((error: unknown) =>
        console.error(`Couldn't undo reminder claim for ${invoice.id}`, error),
      );
  }

  return result;
}
