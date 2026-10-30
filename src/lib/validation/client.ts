import { z } from "zod";

// Turns blank optional fields into undefined so they're stored as NULL.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || undefined)
    .optional();

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address")),
  company: optionalText(100),
  address: optionalText(500),
  notes: optionalText(2000),
});

export type ClientInput = z.infer<typeof clientSchema>;
