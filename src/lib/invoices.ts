import type { InvoiceStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

// Every query is scoped to the owner, like src/lib/clients.ts.

export function listInvoices(userId: string, status?: InvoiceStatus) {
  return db.invoice.findMany({
    where: { userId, ...(status && { status }) },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { name: true } } },
  });
}

export function getInvoice(userId: string, invoiceId: string) {
  return db.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      client: true,
      lineItems: { orderBy: { position: "asc" } },
    },
  });
}
