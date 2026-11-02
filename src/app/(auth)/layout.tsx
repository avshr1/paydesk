import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  // Logged-in users have no reason to see the login or sign-up pages.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        Paydesk
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 p-6 sm:p-8 dark:border-zinc-800">
        {children}
      </div>
    </div>
  );
}
