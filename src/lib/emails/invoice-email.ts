import { formatDate } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export type InvoiceEmailInput = {
  invoiceNumber: string;
  senderName: string;
  clientName: string;
  totalCents: number;
  currency: string;
  dueDate: Date;
  link: string;
};

// Names and notes are typed by users, so they must never be read as HTML.
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildInvoiceEmail(input: InvoiceEmailInput) {
  const total = formatCents(input.totalCents, input.currency);
  const due = formatDate(input.dueDate);
  const subject = `Invoice ${input.invoiceNumber} from ${input.senderName}`;

  const text = [
    `Hi ${input.clientName},`,
    "",
    `${input.senderName} sent you invoice ${input.invoiceNumber} for ${total}, due ${due}.`,
    "",
    `View it here: ${input.link}`,
    "",
    "Thank you!",
  ].join("\n");

  const e = escapeHtml;
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;color:#18181b">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        <p style="margin:0 0 16px">Hi ${e(input.clientName)},</p>
        <p style="margin:0 0 24px">${e(input.senderName)} sent you invoice <strong>${e(input.invoiceNumber)}</strong>.</p>
        <p style="margin:0;font-size:14px;color:#52525b">Amount due</p>
        <p style="margin:4px 0 4px;font-size:28px;font-weight:600">${e(total)}</p>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b">Due ${e(due)}</p>
        <a href="${e(input.link)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:500">View invoice</a>
        <p style="margin:24px 0 0;font-size:12px;color:#71717a">Or copy this link: ${e(input.link)}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
