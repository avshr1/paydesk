import type { Metadata } from "next";
import { createClient } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "New client · Paydesk" };

export default function NewClientPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">New client</h1>
      <ClientForm
        action={createClient}
        submitLabel="Add client"
        cancelHref="/clients"
      />
    </div>
  );
}
