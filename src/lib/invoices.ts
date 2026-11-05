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

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

// For the public page at /i/[token]. No login: the unguessable token is the
// permission (decisions.md #4). Drafts aren't visible until they're sent.
export function getPublicInvoice(token: string) {
  if (!TOKEN_FORMAT.test(token)) return null;

  return db.invoice.findFirst({
    where: { publicToken: token, status: { not: "DRAFT" } },
    include: {
      client: true,
      lineItems: { orderBy: { position: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });
}
