import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getInvoice } from "@/lib/invoices";
import { invoicePdfResponse, notFoundResponse } from "@/lib/pdf/response";

// The freelancer's download. Someone else's invoice looks exactly like one
// that doesn't exist.
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/invoices/[id]/pdf">,
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return notFoundResponse();

  const { id } = await params;
  const [invoice, user] = await Promise.all([
    getInvoice(userId, id),
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
  ]);
  if (!invoice || !user) return notFoundResponse();

  return invoicePdfResponse({ invoice, from: user });
}
