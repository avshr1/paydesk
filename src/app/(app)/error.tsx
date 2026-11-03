"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-red-200 px-6 py-16 text-center dark:border-red-900"
    >
      <p className="font-medium">Something went wrong</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        We couldn&apos;t load this page. Your data is safe.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Try again
      </button>
    </div>
  );
}
