import Link from "next/link";

export default function InvoiceNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
      <p className="font-medium">Invoice not found</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        It may have been deleted, or the link is wrong.
      </p>
      <Link href="/invoices" className="text-sm font-medium underline">
        Back to invoices
      </Link>
    </div>
  );
}
