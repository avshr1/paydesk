import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email,
  // bcrypt only uses the first 72 bytes of a password.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine(
      (value) => new TextEncoder().encode(value).length <= 72,
      "Password is too long",
    ),
});

export const logInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LogInInput = z.infer<typeof logInSchema>;
