"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { signUp, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export function SignUpForm() {
  const [state, formAction] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.message && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
      <FormField
        label="Name"
        name="name"
        autoComplete="name"
        defaultValue={state.values?.name}
        errors={state.errors?.name}
      />
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
        autoComplete="new-password"
        errors={state.errors?.password}
      />
      <SubmitButton pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
