"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { clientSchema } from "@/lib/validation/client";

const fields = ["name", "email", "company", "address", "notes"] as const;
type Field = (typeof fields)[number];

export type ClientFormState = {
  errors?: Partial<Record<Field, string[]>>;
  values?: Partial<Record<Field, string>>;
};

function readForm(formData: FormData) {
  return Object.fromEntries(
    fields.map((field) => [field, String(formData.get(field) ?? "")]),
  ) as Record<Field, string>;
}

export async function createClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const userId = await requireUserId();
  const values = readForm(formData);

  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  await db.client.create({ data: { ...parsed.data, userId } });

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClient(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const userId = await requireUserId();
  const values = readForm(formData);

  const parsed = clientSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  // Blank optional fields must be cleared, not skipped.
  const { company = null, address = null, notes = null } = parsed.data;
  const { count } = await db.client.updateMany({
    where: { id: clientId, userId },
    data: { ...parsed.data, company, address, notes },
  });
  if (count === 0) notFound();

  revalidatePath("/clients");
  redirect("/clients");
}
