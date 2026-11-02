import type { Metadata } from "next";
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
        Clients and invoices are coming next. For now, your account is all set.
      </p>
    </div>
  );
}
