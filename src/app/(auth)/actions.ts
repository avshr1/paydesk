"use server";

import { z } from "zod";
import { signIn } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { signUpSchema } from "@/lib/validation/auth";

export type AuthFormState = {
  message?: string;
  errors?: Partial<Record<"name" | "email" | "password", string[]>>;
  // Typed values (never the password) so the form keeps them after an error.
  values?: { name?: string; email?: string };
};

const EMAIL_TAKEN =
  "An account with this email already exists. Log in instead.";

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { name: input.name, email: input.email };

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  const { name, email, password } = parsed.data;
  try {
    await db.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
    });
  } catch (error) {
    // Unique constraint on email: the account already exists.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { errors: { email: [EMAIL_TAKEN] }, values };
    }
    throw error;
  }

  // Log the new user straight in. On success this throws a redirect.
  await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  return {};
}
