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

// Shared layout for every invoice email. All arguments are plain text and
// are escaped here; the invoice number is bolded where it appears in `intro`.
function renderHtml(parts: {
  clientName: string;
  intro: string;
  invoiceNumber: string;
  total: string;
  dueLine: string;
  link: string;
}): string {
  const e = escapeHtml;
  const intro = e(parts.intro).replace(
    e(parts.invoiceNumber),
    `<strong>${e(parts.invoiceNumber)}</strong>`,
  );
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;color:#18181b">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        <p style="margin:0 0 16px">Hi ${e(parts.clientName)},</p>
        <p style="margin:0 0 24px">${intro}</p>
        <p style="margin:0;font-size:14px;color:#52525b">Amount due</p>
        <p style="margin:4px 0 4px;font-size:28px;font-weight:600">${e(parts.total)}</p>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b">${e(parts.dueLine)}</p>
        <a href="${e(parts.link)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:500">View invoice</a>
        <p style="margin:24px 0 0;font-size:12px;color:#71717a">Or copy this link: ${e(parts.link)}</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function buildInvoiceEmail(input: InvoiceEmailInput) {
  const total = formatCents(input.totalCents, input.currency);
  const due = formatDate(input.dueDate);
  const subject = `Invoice ${input.invoiceNumber} from ${input.senderName}`;
  const intro = `${input.senderName} sent you invoice ${input.invoiceNumber}.`;

  const text = [
    `Hi ${input.clientName},`,
    "",
    `${input.senderName} sent you invoice ${input.invoiceNumber} for ${total}, due ${due}.`,
    "",
    `View it here: ${input.link}`,
    "",
    "Thank you!",
  ].join("\n");

  const html = renderHtml({
    clientName: input.clientName,
    intro,
    invoiceNumber: input.invoiceNumber,
    total,
    dueLine: `Due ${due}`,
    link: input.link,
  });

  return { subject, text, html };
}

export function buildReminderEmail(
  input: InvoiceEmailInput & { daysOverdue: number },
) {
  const total = formatCents(input.totalCents, input.currency);
  const due = formatDate(input.dueDate);
  const late = input.daysOverdue === 1 ? "1 day" : `${input.daysOverdue} days`;
  const subject = `Reminder: invoice ${input.invoiceNumber} is overdue`;
  const intro = `This is a friendly reminder that invoice ${input.invoiceNumber} from ${input.senderName} was due ${due} and is now ${late} overdue.`;

  const text = [
    `Hi ${input.clientName},`,
    "",
    intro,
    `Amount due: ${total}`,
    "",
    `View and pay it here: ${input.link}`,
    "",
    "If you've already paid, thank you, and please ignore this email.",
  ].join("\n");

  const html = renderHtml({
    clientName: input.clientName,
    intro,
    invoiceNumber: input.invoiceNumber,
    total,
    dueLine: `Was due ${due}`,
    link: input.link,
  });

  return { subject, text, html };
}
