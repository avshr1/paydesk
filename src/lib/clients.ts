import { db } from "@/lib/db";

// Every query is scoped to the owner, so one user can never read or change
// another user's clients, even by guessing an ID.

export function listClients(userId: string, { archived = false } = {}) {
  return db.client.findMany({
    where: { userId, archivedAt: archived ? { not: null } : null },
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } },
  });
}

export function getClient(userId: string, clientId: string) {
  return db.client.findFirst({ where: { id: clientId, userId } });
}
