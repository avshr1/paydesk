import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { listClients } from "@/lib/clients";
import { toDateInputValue } from "@/lib/dates";
import { isEditable } from "@/lib/invoice-status";
import { getInvoice } from "@/lib/invoices";
import { requireUserId } from "@/lib/session";
import { updateInvoice } from "../../actions";
import { InvoiceForm } from "../../invoice-form";

export const metadata: Metadata = { title: "Edit invoice · Paydesk" };

// Shows "12.5" for 1250 hundredths, and "12" rather than "12.00".
function fromHundredths(value: number) {
  return (value / 100).toFixed(2).replace(/\.00$/, "");
}

export default async function EditInvoicePage({
  params,
}: PageProps<"/invoices/[id]/edit">) {
  const { id } = await params;
  const userId = await requireUserId();

  const invoice = await getInvoice(userId, id);
  if (!invoice) notFound();
  if (!isEditable(invoice.status)) redirect(`/invoices/${invoice.id}`);

  const clients = await listClients(userId);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        Edit <span className="font-mono">{invoice.number}</span>
      </h1>
      <InvoiceForm
        action={updateInvoice.bind(null, invoice.id)}
        clients={clients.map(({ id, name }) => ({ id, name }))}
        defaultValues={{
          clientId: invoice.clientId,
          issueDate: toDateInputValue(invoice.issueDate),
          dueDate: toDateInputValue(invoice.dueDate),
          taxRate: fromHundredths(invoice.taxRateBps),
          notes: invoice.notes ?? "",
          lineItems: invoice.lineItems.map((item) => ({
            description: item.description,
            quantity: fromHundredths(item.quantityHundredths),
            unitPrice: fromHundredths(item.unitPriceCents),
          })),
        }}
        submitLabel="Save changes"
        cancelHref={`/invoices/${invoice.id}`}
      />
    </div>
  );
}
