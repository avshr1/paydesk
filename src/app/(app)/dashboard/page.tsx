import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Dashboard · Paydesk" };

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">
        {firstName ? `Welcome, ${firstName}` : "Welcome"}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Pick up where you left off.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/invoices/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New invoice
        </Link>
        <Link
          href="/clients"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          View clients
        </Link>
      </div>
    </div>
  );
}
