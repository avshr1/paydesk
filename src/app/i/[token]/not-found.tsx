export default function PublicInvoiceNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <h1 className="text-lg font-semibold">Invoice not found</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        This link is invalid or the invoice is no longer available. Contact the
        person who sent it for a new link.
      </p>
    </main>
  );
}
