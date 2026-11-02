"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { logIn, type AuthFormState } from "../actions";

export function LogInForm({ initialMessage }: { initialMessage?: string }) {
  const [state, formAction] = useActionState(logIn, {
    message: initialMessage,
  } satisfies AuthFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.message && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      )}
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={state.errors?.email}
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        errors={state.errors?.password}
      />
      <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
    </form>
  );
}
