"use client";

import { useActionState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import type { SendInvoiceState } from "../actions";

export function SendInvoiceForm({
  action,
  clientEmail,
}: {
  action: (
    state: SendInvoiceState,
    formData: FormData,
  ) => Promise<SendInvoiceState>;
  clientEmail: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <ConfirmButton
        confirmMessage={`Email this invoice to ${clientEmail}? It can't be edited after it's sent.`}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Send invoice
      </ConfirmButton>
      {state.error && (
        <p
          role="alert"
          className="max-w-xs text-right text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}
