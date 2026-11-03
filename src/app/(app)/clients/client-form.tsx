"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import type { ClientFormState } from "./actions";

type ClientFormProps = {
  action: (
    state: ClientFormState,
    formData: FormData,
  ) => Promise<ClientFormState>;
  defaultValues?: ClientFormState["values"];
  submitLabel: string;
  cancelHref: string;
};

export function ClientForm({
  action,
  defaultValues,
  submitLabel,
  cancelHref,
}: ClientFormProps) {
  const [state, formAction] = useActionState(action, {
    values: defaultValues,
  });
  const values = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Name"
          name="name"
          autoComplete="off"
          defaultValue={values.name}
          errors={state.errors?.name}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={values.email}
          errors={state.errors?.email}
        />
      </div>
      <FormField
        label="Company (optional)"
        name="company"
        autoComplete="off"
        defaultValue={values.company}
        errors={state.errors?.company}
      />
      <FormField
        label="Address (optional)"
        name="address"
        multiline
        defaultValue={values.address}
        errors={state.errors?.address}
      />
      <FormField
        label="Notes (optional)"
        name="notes"
        multiline
        defaultValue={values.notes}
        errors={state.errors?.notes}
      />
      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
