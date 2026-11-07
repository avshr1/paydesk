import {
  EmailStatus,
  EmailType,
  InvoiceStatus,
} from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { buildInvoiceEmail } from "@/lib/emails/invoice-email";
import { env } from "@/lib/env";

export type DeliveryResult =
  | { status: "sent" }
  | { status: "not_found" }
  | { status: "failed"; error: string };

export function publicInvoiceUrl(publicToken: string): string {
  return new URL(`/i/${publicToken}`, env.APP_URL).toString();
}

// Emails the client, then marks the invoice SENT. The order matters: if the
// email fails, the invoice stays an editable draft and the user can retry.
export async function deliverInvoice(
  userId: string,
  invoiceId: string,
): Promise<DeliveryResult> {
  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      client: { select: { name: true, email: true } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!invoice) return { status: "not_found" };
  if (invoice.status !== InvoiceStatus.DRAFT) {
    return { status: "failed", error: "This invoice has already been sent." };
  }

  const to = invoice.client.email;
  const result = await sendEmail({
    to,
    ...buildInvoiceEmail({
      invoiceNumber: invoice.number,
      senderName: invoice.user.name ?? invoice.user.email,
      clientName: invoice.client.name,
      totalCents: invoice.totalCents,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      link: publicInvoiceUrl(invoice.publicToken),
    }),
  });

  if (!result.ok) {
    await db.emailLog.create({
      data: {
        invoiceId,
        type: EmailType.INVOICE,
        to,
        status: EmailStatus.FAILED,
        error: result.error,
      },
    });
    return { status: "failed", error: result.error };
  }

  await db.$transaction([
    db.emailLog.create({
      data: {
        invoiceId,
        type: EmailType.INVOICE,
        to,
        status: EmailStatus.SENT,
        providerId: result.id,
      },
    }),
    db.invoice.updateMany({
      where: { id: invoiceId, userId, status: InvoiceStatus.DRAFT },
      data: { status: InvoiceStatus.SENT, sentAt: new Date() },
    }),
  ]);
  return { status: "sent" };
}
