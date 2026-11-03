import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient } from "@/lib/clients";
import { requireUserId } from "@/lib/session";
import { updateClient } from "../actions";
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

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{client.name}</h1>
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
    </div>
  );
}
