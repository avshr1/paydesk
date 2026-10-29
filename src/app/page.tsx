const features = [
  {
    title: "Clients in one place",
    body: "Keep every client's contact details, notes, and invoice history together.",
  },
  {
    title: "Invoices that add up",
    body: "Line items, tax, and due dates, with totals calculated on the server so they're always right.",
  },
  {
    title: "Get paid online",
    body: "Clients open a private link and pay by card through Stripe. No account needed.",
  },
  {
    title: "Automatic reminders",
    body: "Late invoices are marked overdue and clients get a polite weekly nudge.",
  },
];

const steps = [
  "Add a client",
  "Create an invoice",
  "Send the link",
  "Get paid",
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">Paydesk</span>
        <a
          href="https://github.com/avshr1/paydesk"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          GitHub
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-20 px-6 py-16">
        <section className="flex max-w-2xl flex-col gap-6">
          <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            In development · sign-up coming soon
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Invoicing and payments for freelancers.
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Manage clients, send invoices, and get paid online, without
            spreadsheets or chasing emails.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://github.com/avshr1/paydesk"
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              View the code
            </a>
            <a
              href="https://github.com/avshr1/paydesk#roadmap"
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              See the roadmap
            </a>
          </div>
        </section>

        <section aria-labelledby="features" className="flex flex-col gap-6">
          <h2 id="features" className="text-xl font-semibold">
            What it does
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
              >
                <h3 className="font-medium">{feature.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how" className="flex flex-col gap-6">
          <h2 id="how" className="text-xl font-semibold">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-sm text-zinc-500">
        Payments run in Stripe test mode. No real money moves.
      </footer>
    </div>
  );
}
