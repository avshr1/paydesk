import type { Metadata } from "next";
import Link from "next/link";
import { LogInForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Paydesk" };

// Errors Auth.js can send back to this page as ?error=...
const errorMessages: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email already has a password account. Log in with your password instead.",
  AccessDenied: "That Google account couldn't be used to log in.",
};

export default async function LogInPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message =
    typeof error === "string"
      ? (errorMessages[error] ?? "Something went wrong. Please try again.")
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back to Paydesk.
        </p>
      </div>
      <LogInForm initialMessage={message} />
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        New to Paydesk?{" "}
        <Link
          href="/signup"
          className="font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
