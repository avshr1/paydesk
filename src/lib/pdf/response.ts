import { pdfFilename } from "@/lib/invoice-format";
import { renderInvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf";

export async function invoicePdfResponse(data: InvoicePdfData) {
  const pdf = await renderInvoicePdf(data);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFilename(data.invoice.number)}"`,
      // Invoices are private documents: never store them in shared caches.
      "Cache-Control": "private, no-store",
    },
  });
}

export function notFoundResponse() {
  return new Response("Not found", { status: 404 });
}
