export default function AppLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-16 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
