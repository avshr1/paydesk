import { z } from "zod";
import { parseHundredths } from "@/lib/money";

// Parses typed amounts like "1.5" or "1,200.00" into integer hundredths.
const hundredths = (label: string) =>
  z.string().transform((value, ctx) => {
    const parsed = parseHundredths(value);
    if (parsed === null) {
      ctx.addIssue({
        code: "custom",
        message: `${label} must be a number with up to 2 decimals`,
      });
      return z.NEVER;
    }
    return parsed;
  });

const isoDate = z.iso.date("Enter a valid date");

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(500),
  quantityHundredths: hundredths("Quantity").pipe(
    z.number().positive("Quantity must be more than 0"),
  ),
  unitPriceCents: hundredths("Unit price"),
});

export const invoiceSchema = z
  .object({
    clientId: z.string().min(1, "Choose a client"),
    issueDate: isoDate,
    dueDate: isoDate,
    // A percentage in hundredths is basis points: "8.25" → 825.
    taxRateBps: hundredths("Tax rate").pipe(
      z.number().max(10_000, "Tax rate can't be more than 100%"),
    ),
    notes: z
      .string()
      .trim()
      .max(2000)
      .transform((value) => value || undefined)
      .optional(),
    lineItems: z
      .array(lineItemSchema)
      .min(1, "Add at least one line item")
      .max(100, "An invoice can have at most 100 line items"),
  })
  .refine((invoice) => invoice.dueDate >= invoice.issueDate, {
    message: "Due date can't be before the issue date",
    path: ["dueDate"],
  });

export type InvoiceInput = z.infer<typeof invoiceSchema>;
