"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { PayState } from "./actions";

export function PayButton({
  action,
  amount,
}: {
  action: (state: PayState, formData: FormData) => Promise<PayState>;
  amount: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <SubmitButton pendingText="Opening secure checkout…">
        Pay {amount}
      </SubmitButton>
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
