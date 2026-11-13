import type { Metadata } from "next";
import Link from "next/link";
import { countArchivedClients, listClients } from "@/lib/clients";
import { requireUserId } from "@/lib/session";

export const metadata: Metadata = { title: "Clients · Paydesk" };

export default async function ClientsPage({
  searchParams,
}: PageProps<"/clients">) {
  const showArchived = (await searchParams).archived === "1";
  const userId = await requireUserId();
  const [clients, archivedCount] = await Promise.all([
    listClients(userId, { archived: showArchived }),
    countArchivedClients(userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          {showArchived ? "Archived clients" : "Clients"}
        </h1>
        <Link
          href="/clients/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Add client
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">
            {showArchived ? "No archived clients" : "No clients yet"}
          </p>
          {!showArchived && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Add the people and companies you bill.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/clients/${client.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{client.name}</p>
                  <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                    {client.company ? `${client.company} · ` : ""}
                    {client.email}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  {client._count.invoices}{" "}
                  {client._count.invoices === 1 ? "invoice" : "invoices"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(showArchived || archivedCount > 0) && (
        <Link
          href={showArchived ? "/clients" : "/clients?archived=1"}
          className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {showArchived
            ? "Back to active clients"
            : `View archived clients (${archivedCount})`}
        </Link>
      )}
    </div>
  );
}
