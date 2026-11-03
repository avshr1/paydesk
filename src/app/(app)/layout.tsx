import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logOut } from "./actions";

// Every page in this group requires a logged-in user. This is the real check;
// src/proxy.ts only redirects early.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Paydesk
            </Link>
            <Link
              href="/clients"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Clients
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-zinc-600 sm:inline dark:text-zinc-400">
              {session.user.email}
            </span>
            <form action={logOut}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
