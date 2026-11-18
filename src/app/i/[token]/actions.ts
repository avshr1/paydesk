"use server";

import { notFound, redirect } from "next/navigation";
import { createCheckoutForToken } from "@/lib/checkout";

export type PayState = { error?: string };

// No login: like the public page itself, the token is the permission.
export async function payInvoice(token: string): Promise<PayState> {
  if (typeof token !== "string") notFound();

  const result = await createCheckoutForToken(token);
  if (result.status === "not_found") notFound();
  if (result.status === "error") return { error: result.error };
  redirect(result.url);
}
