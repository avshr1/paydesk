"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import {
  generatePublicToken,
  nextInvoiceNumber,
} from "@/lib/invoice-identifiers";
import { calculateTotals } from "@/lib/money";
import { requireUserId } from "@/lib/session";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";

export type LineItemValues = {
  description: string;
  quantity: string;
  unitPrice: string;
};

export type InvoiceFormValues = {
  clientId: string;
  issueDate: string;
  dueDate: string;
  taxRate: string;
  notes: string;
  lineItems: LineItemValues[];
};

export type InvoiceFormState = {
  // Keyed by field path, e.g. "dueDate" or "lineItems.0.unitPriceCents".
  errors?: Record<string, string[]>;
  values?: InvoiceFormValues;
};

function readForm(formData: FormData): InvoiceFormValues {
  let lineItems: LineItemValues[] = [];
  try {
    const parsed: unknown = JSON.parse(String(formData.get("lineItems")));
    if (Array.isArray(parsed)) lineItems = parsed as LineItemValues[];
  } catch {
    // Leave empty; validation reports "Add at least one line item".
  }
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    clientId: text("clientId"),
    issueDate: text("issueDate"),
    dueDate: text("dueDate"),
    taxRate: text("taxRate"),
    notes: text("notes"),
    lineItems,
  };
}

type Parsed =
  { ok: true; data: InvoiceInput } | { ok: false; state: InvoiceFormState };

async function parseInvoice(
  userId: string,
  values: InvoiceFormValues,
): Promise<Parsed> {
  const result = invoiceSchema.safeParse({
    ...values,
    taxRateBps: values.taxRate,
    lineItems: values.lineItems.map((item) => ({
      description: String(item.description ?? ""),
      quantityHundredths: String(item.quantity ?? ""),
      unitPriceCents: String(item.unitPrice ?? ""),
    })),
  });

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".").replace("taxRateBps", "taxRate");
      (errors[key] ??= []).push(issue.message);
    }
    return { ok: false, state: { errors, values } };
  }

  // The client must belong to this user and not be archived.
  const client = await db.client.findFirst({
    where: { id: result.data.clientId, userId, archivedAt: null },
    select: { id: true },
  });
  if (!client) {
    return {
      ok: false,
      state: { errors: { clientId: ["Choose a client"] }, values },
    };
  }

  return { ok: true, data: result.data };
}

// Totals always come from the server, never the browser. See decisions.md #2.
function invoiceData(data: InvoiceInput) {
  const totals = calculateTotals(data.lineItems, data.taxRateBps);
  return {
    clientId: data.clientId,
    issueDate: parseDateOnly(data.issueDate),
    dueDate: parseDateOnly(data.dueDate),
    notes: data.notes ?? null,
    taxRateBps: data.taxRateBps,
    subtotalCents: totals.subtotalCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    lineItems: data.lineItems.map((item, position) => ({
      position,
      description: item.description,
      quantityHundredths: item.quantityHundredths,
      unitPriceCents: item.unitPriceCents,
      amountCents: totals.lineAmountsCents[position] ?? 0,
    })),
  };
}

export async function createInvoice(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const userId = await requireUserId();
  const parsed = await parseInvoice(userId, readForm(formData));
  if (!parsed.ok) return parsed.state;

  const { lineItems, ...data } = invoiceData(parsed.data);

  // Two invoices created at the same moment could pick the same number; the
  // unique (userId, number) constraint catches that, so try again.
  let invoiceId: string | undefined;
  for (let attempt = 0; attempt < 3 && !invoiceId; attempt++) {
    const latest = await db.invoice.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { number: true },
    });
    try {
      const invoice = await db.invoice.create({
        data: {
          ...data,
          userId,
          number: nextInvoiceNumber(latest?.number ?? null),
          publicToken: generatePublicToken(),
          lineItems: { create: lineItems },
        },
        select: { id: true },
      });
      invoiceId = invoice.id;
    } catch (error) {
      const isNumberTaken =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!isNumberTaken) throw error;
    }
  }
  if (!invoiceId) {
    throw new Error("Could not assign an invoice number. Please try again.");
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}
