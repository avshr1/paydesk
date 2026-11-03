import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countInvoices, getClient } from "@/lib/clients";
import { requireUserId } from "@/lib/session";
import { ConfirmButton } from "@/components/confirm-button";
import { removeClient, restoreClient, updateClient } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Edit client · Paydesk" };

export default async function EditClientPage({
  params,
}: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();

  // Another user's client looks exactly like one that doesn't exist.
  const client = await getClient(userId, id);
  if (!client) notFound();

  const invoiceCount = await countInvoices(userId, client.id);
  const canDelete = invoiceCount === 0;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{client.name}</h1>
      {client.archivedAt && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <span>This client is archived and hidden from your client list.</span>
          <form action={restoreClient.bind(null, client.id)}>
            <button type="submit" className="font-medium underline">
              Restore
            </button>
          </form>
        </div>
      )}
      <ClientForm
        action={updateClient.bind(null, client.id)}
        defaultValues={{
          name: client.name,
          email: client.email,
          company: client.company ?? "",
          address: client.address ?? "",
          notes: client.notes ?? "",
        }}
        submitLabel="Save changes"
        cancelHref="/clients"
      />
      {!client.archivedAt && (
        <section className="flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h2 className="font-medium">
            {canDelete ? "Delete client" : "Archive client"}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {canDelete
              ? "This client has no invoices, so it can be deleted permanently."
              : `This client has ${invoiceCount} ${invoiceCount === 1 ? "invoice" : "invoices"}, so it will be archived instead of deleted. You can restore it later.`}
          </p>
          <form action={removeClient.bind(null, client.id)}>
            <ConfirmButton
              confirmMessage={
                canDelete
                  ? `Delete ${client.name}? This can't be undone.`
                  : `Archive ${client.name}?`
              }
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              {canDelete ? "Delete client" : "Archive client"}
            </ConfirmButton>
          </form>
        </section>
      )}
    </div>
  );
}
