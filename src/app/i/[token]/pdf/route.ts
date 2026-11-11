import type { NextRequest } from "next/server";
import { getPublicInvoice } from "@/lib/invoices";
import { invoicePdfResponse, notFoundResponse } from "@/lib/pdf/response";

// The client's download. Like the public page, the token is the permission.
export async function GET(
  _request: NextRequest,
  { params }: RouteContext<"/i/[token]/pdf">,
) {
  const { token } = await params;

  const invoice = await getPublicInvoice(token);
  if (!invoice) return notFoundResponse();

  return invoicePdfResponse({ invoice, from: invoice.user });
}
