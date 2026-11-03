import type { Metadata } from "next";
import Link from "next/link";
import { listClients } from "@/lib/clients";
import { toDateInputValue } from "@/lib/dates";
import { requireUserId } from "@/lib/session";
import { createInvoice } from "../actions";
import { InvoiceForm } from "../invoice-form";

export const metadata: Metadata = { title: "New invoice · Paydesk" };

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function NewInvoicePage() {
  const userId = await requireUserId();
  const clients = await listClients(userId);

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
        <p className="font-medium">Add a client first</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Every invoice is billed to one of your clients.
        </p>
        <Link href="/clients/new" className="text-sm font-medium underline">
          Add a client
        </Link>
      </div>
    );
  }

  const today = new Date();
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">New invoice</h1>
      <InvoiceForm
        action={createInvoice}
        clients={clients.map(({ id, name }) => ({ id, name }))}
        defaultValues={{
          clientId: clients.length === 1 ? (clients[0]?.id ?? "") : "",
          issueDate: toDateInputValue(today),
          dueDate: toDateInputValue(new Date(today.getTime() + 14 * DAY_MS)),
          taxRate: "0",
          notes: "",
          lineItems: [],
        }}
        submitLabel="Create invoice"
        cancelHref="/invoices"
      />
    </div>
  );
}
