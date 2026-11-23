import { EmailStatus, EmailType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import {
  buildPaidNotificationEmail,
  buildReceiptEmail,
} from "@/lib/emails/invoice-email";
import { env } from "@/lib/env";
import { publicInvoiceUrl } from "@/lib/invoice-delivery";

// After an invoice is marked paid: a receipt to the client and a notice to
// the freelancer. Best effort: the payment is already safely recorded, so a
// failed email is logged and never undoes or retries it.
export async function sendPaymentEmails(invoiceId: string): Promise<void> {
  if (!isEmailConfigured) return;

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      client: { select: { name: true, email: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!invoice?.paidAt) return;

  const base = {
    invoiceNumber: invoice.number,
    senderName: invoice.user.name ?? invoice.user.email,
    clientName: invoice.client.name,
    totalCents: invoice.totalCents,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
  };

  const [receipt, notice] = await Promise.all([
    sendEmail({
      to: invoice.client.email,
      ...buildReceiptEmail({
        ...base,
        link: publicInvoiceUrl(invoice.publicToken),
      }),
    }),
    sendEmail({
      to: invoice.user.email,
      ...buildPaidNotificationEmail({
        ...base,
        link: new URL(`/invoices/${invoice.id}`, env.APP_URL).toString(),
      }),
    }),
  ]);

  // EmailLog tracks what was sent to clients, so the receipt is logged.
  await db.emailLog.create({
    data: {
      invoiceId,
      type: EmailType.RECEIPT,
      to: invoice.client.email,
      status: receipt.ok ? EmailStatus.SENT : EmailStatus.FAILED,
      providerId: receipt.ok ? receipt.id : null,
      error: receipt.ok ? null : receipt.error,
    },
  });
  if (!notice.ok) {
    console.error(`Paid notice for invoice ${invoiceId} failed`, notice.error);
  }
}
