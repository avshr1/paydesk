"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
