"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { calculateTotals, formatCents, parseHundredths } from "@/lib/money";
import type {
  InvoiceFormState,
  InvoiceFormValues,
  LineItemValues,
} from "./actions";

type Row = LineItemValues & { key: number };

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-invalid:border-red-500 dark:border-zinc-700 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

let nextKey = 0;
const emptyRow = (): Row => ({
  key: nextKey++,
  description: "",
  quantity: "1",
  unitPrice: "",
});

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="text-sm text-red-600 dark:text-red-400">{messages[0]}</p>
  );
}

type InvoiceFormProps = {
  action: (
    state: InvoiceFormState,
    formData: FormData,
  ) => Promise<InvoiceFormState>;
  clients: { id: string; name: string }[];
  defaultValues: InvoiceFormValues;
  submitLabel: string;
  cancelHref: string;
};

export function InvoiceForm({
  action,
  clients,
  defaultValues,
  submitLabel,
  cancelHref,
}: InvoiceFormProps) {
  const [state, formAction] = useActionState(action, {
    values: defaultValues,
  });
  const values = state.values ?? defaultValues;
  const errors = state.errors ?? {};

  // Line items and tax are controlled so the live totals can update as you
  // type, and so they survive a failed submit.
  const [rows, setRows] = useState<Row[]>(() =>
    defaultValues.lineItems.length
      ? defaultValues.lineItems.map((item) => ({ ...item, key: nextKey++ }))
      : [emptyRow()],
  );
  const [taxRate, setTaxRate] = useState(defaultValues.taxRate);

  const updateRow = (key: number, field: keyof LineItemValues, value: string) =>
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );

  // Preview only. The server recalculates the real totals on save.
  const preview = calculateTotals(
    rows.map((row) => ({
      quantityHundredths: parseHundredths(row.quantity) ?? 0,
      unitPriceCents: parseHundredths(row.unitPrice) ?? 0,
    })),
    Math.min(parseHundredths(taxRate) ?? 0, 10_000),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.message && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      )}
      <input
        type="hidden"
        name="lineItems"
        value={JSON.stringify(
          rows.map(({ description, quantity, unitPrice }) => ({
            description,
            quantity,
            unitPrice,
          })),
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5 sm:col-span-3">
          <label htmlFor="clientId" className="text-sm font-medium">
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            defaultValue={values.clientId}
            aria-invalid={Boolean(errors.clientId)}
            className={inputClass}
          >
            <option value="">Choose a client…</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <FieldError messages={errors.clientId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="issueDate" className="text-sm font-medium">
            Issue date
          </label>
          <input
            id="issueDate"
            name="issueDate"
            type="date"
            defaultValue={values.issueDate}
            aria-invalid={Boolean(errors.issueDate)}
            className={inputClass}
          />
          <FieldError messages={errors.issueDate} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dueDate" className="text-sm font-medium">
            Due date
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={values.dueDate}
            aria-invalid={Boolean(errors.dueDate)}
            className={inputClass}
          />
          <FieldError messages={errors.dueDate} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="taxRate" className="text-sm font-medium">
            Tax rate (%)
          </label>
          <input
            id="taxRate"
            name="taxRate"
            inputMode="decimal"
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
            aria-invalid={Boolean(errors.taxRate)}
            className={inputClass}
          />
          <FieldError messages={errors.taxRate} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">Line items</legend>
        <div className="hidden grid-cols-[1fr_6rem_8rem_7rem_2rem] gap-3 text-xs text-zinc-500 sm:grid">
          <span>Description</span>
          <span>Qty</span>
          <span>Unit price</span>
          <span className="text-right">Amount</span>
        </div>
        {rows.map((row, index) => {
          const error = (field: string) =>
            errors[`lineItems.${index}.${field}`];
          return (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_6rem_8rem_7rem_2rem] sm:items-start sm:border-0 sm:p-0 dark:border-zinc-800"
            >
              <div className="col-span-2 sm:col-span-1">
                <input
                  aria-label={`Line ${index + 1} description`}
                  placeholder="Description"
                  value={row.description}
                  onChange={(e) =>
                    updateRow(row.key, "description", e.target.value)
                  }
                  aria-invalid={Boolean(error("description"))}
                  className={inputClass}
                />
                <FieldError messages={error("description")} />
              </div>
              <div>
                <input
                  aria-label={`Line ${index + 1} quantity`}
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(e) =>
                    updateRow(row.key, "quantity", e.target.value)
                  }
                  aria-invalid={Boolean(error("quantityHundredths"))}
                  className={inputClass}
                />
                <FieldError messages={error("quantityHundredths")} />
              </div>
              <div>
                <input
                  aria-label={`Line ${index + 1} unit price`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={row.unitPrice}
                  onChange={(e) =>
                    updateRow(row.key, "unitPrice", e.target.value)
                  }
                  aria-invalid={Boolean(error("unitPriceCents"))}
                  className={inputClass}
                />
                <FieldError messages={error("unitPriceCents")} />
              </div>
              <span className="self-center text-right text-sm tabular-nums">
                {formatCents(preview.lineAmountsCents[index] ?? 0)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setRows((current) => current.filter((r) => r.key !== row.key))
                }
                disabled={rows.length === 1}
                aria-label={`Remove line ${index + 1}`}
                className="self-center rounded p-1 text-zinc-500 hover:text-red-600 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          );
        })}
        <FieldError messages={errors.lineItems} />
        <button
          type="button"
          onClick={() => setRows((current) => [...current, emptyRow()])}
          className="w-fit text-sm font-medium underline"
        >
          + Add line item
        </button>
      </fieldset>

      <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm">
        <dt className="text-zinc-600 dark:text-zinc-400">Subtotal</dt>
        <dd className="text-right tabular-nums">
          {formatCents(preview.subtotalCents)}
        </dd>
        <dt className="text-zinc-600 dark:text-zinc-400">Tax</dt>
        <dd className="text-right tabular-nums">
          {formatCents(preview.taxCents)}
        </dd>
        <dt className="border-t border-zinc-200 pt-2 font-medium dark:border-zinc-800">
          Total
        </dt>
        <dd className="border-t border-zinc-200 pt-2 text-right font-semibold tabular-nums dark:border-zinc-800">
          {formatCents(preview.totalCents)}
        </dd>
      </dl>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={values.notes}
          placeholder="Payment terms, thank-you note…"
          className={inputClass}
        />
        <FieldError messages={errors.notes} />
      </div>

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
