// Fills a local database with a demo account for trying the app and taking
// screenshots. Run with `npx prisma db seed`. Safe to rerun: it replaces only
// the demo account's data.
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { InvoiceStatus } from "../src/generated/prisma/enums";
import {
  formatInvoiceNumber,
  generatePublicToken,
} from "../src/lib/invoice-identifiers";
import { calculateTotals } from "../src/lib/money";
import { hashPassword } from "../src/lib/password";

config({ path: [".env.local", ".env"], quiet: true });

const DEMO_EMAIL = "demo@paydesk.test";
// A demo-only password, used solely on local databases (see the guard below).
const DEMO_PASSWORD = "demo-password";

const DAY_MS = 24 * 60 * 60 * 1000;

const clients = [
  {
    name: "Grace Hopper",
    email: "grace@navylabs.example",
    company: "Navy Labs",
    address: "1 Harbor St\nArlington, VA 22201",
  },
  {
    name: "Alan Turing",
    email: "alan@bletchley.example",
    company: "Bletchley Analytics",
    address: null,
  },
  {
    name: "Katherine Johnson",
    email: "katherine@orbital.example",
    company: "Orbital Studio",
    address: "400 Launch Ave\nHampton, VA 23666",
  },
  {
    name: "Margaret Hamilton",
    email: "margaret@apollo.example",
    company: null,
    address: null,
  },
];

type Line = { description: string; quantity: number; price: number };
type SeedInvoice = {
  client: number;
  issuedDaysAgo: number;
  dueInDays: number;
  status: InvoiceStatus;
  paidDaysAfterIssue?: number;
  taxRateBps: number;
  lines: Line[];
  notes?: string;
};

// Quantities and prices in whole units; converted to hundredths and cents.
const invoices: SeedInvoice[] = [
  {
    client: 0,
    issuedDaysAgo: 340,
    dueInDays: 30,
    status: "PAID",
    paidDaysAfterIssue: 12,
    taxRateBps: 0,
    lines: [
      { description: "Brand discovery workshop", quantity: 1, price: 1200 },
    ],
  },
  {
    client: 1,
    issuedDaysAgo: 300,
    dueInDays: 30,
    status: "PAID",
    paidDaysAfterIssue: 20,
    taxRateBps: 825,
    lines: [{ description: "Data pipeline audit", quantity: 12, price: 95 }],
  },
  {
    client: 2,
    issuedDaysAgo: 250,
    dueInDays: 14,
    status: "PAID",
    paidDaysAfterIssue: 9,
    taxRateBps: 0,
    lines: [
      { description: "Landing page design", quantity: 1, price: 1800 },
      { description: "Revisions", quantity: 4, price: 75 },
    ],
  },
  {
    client: 0,
    issuedDaysAgo: 210,
    dueInDays: 30,
    status: "PAID",
    paidDaysAfterIssue: 25,
    taxRateBps: 825,
    lines: [{ description: "Website build", quantity: 30, price: 85 }],
  },
  {
    client: 3,
    issuedDaysAgo: 160,
    dueInDays: 14,
    status: "PAID",
    paidDaysAfterIssue: 6,
    taxRateBps: 0,
    lines: [{ description: "Code review", quantity: 8, price: 110 }],
  },
  {
    client: 1,
    issuedDaysAgo: 120,
    dueInDays: 30,
    status: "PAID",
    paidDaysAfterIssue: 15,
    taxRateBps: 825,
    lines: [
      { description: "Dashboard prototype", quantity: 22.5, price: 95 },
      { description: "Hosting (annual)", quantity: 1, price: 240 },
    ],
  },
  {
    client: 2,
    issuedDaysAgo: 75,
    dueInDays: 30,
    status: "PAID",
    paidDaysAfterIssue: 18,
    taxRateBps: 0,
    lines: [{ description: "Illustration set", quantity: 6, price: 150 }],
  },
  {
    client: 0,
    issuedDaysAgo: 40,
    dueInDays: 14,
    status: "PAID",
    paidDaysAfterIssue: 10,
    taxRateBps: 825,
    lines: [{ description: "Maintenance retainer", quantity: 1, price: 600 }],
  },
  {
    client: 3,
    issuedDaysAgo: 50,
    dueInDays: 14,
    status: "OVERDUE",
    taxRateBps: 0,
    lines: [{ description: "Security review", quantity: 10, price: 120 }],
    notes: "Second reminder sent.",
  },
  {
    client: 1,
    issuedDaysAgo: 25,
    dueInDays: 14,
    status: "SENT",
    taxRateBps: 825,
    lines: [{ description: "Report automation", quantity: 9, price: 95 }],
  },
  {
    client: 2,
    issuedDaysAgo: 8,
    dueInDays: 30,
    status: "SENT",
    taxRateBps: 0,
    lines: [
      { description: "App icon design", quantity: 1, price: 450 },
      { description: "Splash screens", quantity: 3, price: 80 },
    ],
  },
  {
    client: 0,
    issuedDaysAgo: 2,
    dueInDays: 30,
    status: "DRAFT",
    taxRateBps: 825,
    lines: [{ description: "Website build, phase 2", quantity: 18, price: 85 }],
    notes: "Payment due within 30 days. Thank you!",
  },
  {
    client: 3,
    issuedDaysAgo: 0,
    dueInDays: 14,
    status: "DRAFT",
    taxRateBps: 0,
    lines: [
      { description: "Architecture consultation", quantity: 3, price: 150 },
    ],
  },
];

// A calendar day, stored as midnight UTC like the app does.
function dayOffset(now: Date, days: number): Date {
  const date = new Date(now.getTime() + days * DAY_MS);
  return new Date(`${date.toISOString().slice(0, 10)}T00:00:00Z`);
}

function assertLocalDatabase(url: string | undefined): string {
  if (!url) throw new Error("DATABASE_URL is not set.");
  const host = new URL(url).hostname;
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!isLocal && process.env.SEED_ALLOW_REMOTE !== "1") {
    throw new Error(
      `Refusing to seed ${host}: the demo account has a known password. ` +
        "Seed only local databases, or set SEED_ALLOW_REMOTE=1 if you're sure.",
    );
  }
  return url;
}

async function main() {
  const connectionString = assertLocalDatabase(process.env.DATABASE_URL);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const now = new Date();

  try {
    // Replace only the demo account. Invoices first: clients with invoices
    // can't be deleted (decisions.md #5).
    await db.invoice.deleteMany({ where: { user: { email: DEMO_EMAIL } } });
    await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

    const user = await db.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo Freelancer",
        passwordHash: await hashPassword(DEMO_PASSWORD),
        clients: { create: clients },
      },
      include: { clients: { orderBy: { name: "asc" } } },
    });
    const clientIds = clients.map(
      (client) => user.clients.find((c) => c.email === client.email)!.id,
    );

    // Oldest first, numbered in order, so the app's next number follows on.
    const ordered = [...invoices].sort(
      (a, b) => b.issuedDaysAgo - a.issuedDaysAgo,
    );
    for (const [index, invoice] of ordered.entries()) {
      const lineItems = invoice.lines.map((line) => ({
        quantityHundredths: Math.round(line.quantity * 100),
        unitPriceCents: Math.round(line.price * 100),
      }));
      const totals = calculateTotals(lineItems, invoice.taxRateBps);
      const issueDate = dayOffset(now, -invoice.issuedDaysAgo);
      const sent = invoice.status !== "DRAFT";

      await db.invoice.create({
        data: {
          userId: user.id,
          clientId: clientIds[invoice.client]!,
          number: formatInvoiceNumber(index + 1),
          status: invoice.status,
          publicToken: generatePublicToken(),
          issueDate,
          dueDate: dayOffset(issueDate, invoice.dueInDays),
          notes: invoice.notes ?? null,
          taxRateBps: invoice.taxRateBps,
          subtotalCents: totals.subtotalCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
          sentAt: sent ? issueDate : null,
          paidAt:
            invoice.paidDaysAfterIssue === undefined
              ? null
              : dayOffset(issueDate, invoice.paidDaysAfterIssue),
          createdAt: issueDate,
          lineItems: {
            create: invoice.lines.map((line, position) => ({
              position,
              description: line.description,
              quantityHundredths: lineItems[position]!.quantityHundredths,
              unitPriceCents: lineItems[position]!.unitPriceCents,
              amountCents: totals.lineAmountsCents[position]!,
            })),
          },
        },
      });
    }

    console.log(
      `Seeded ${clients.length} clients and ${invoices.length} invoices.\n` +
        `Log in as ${DEMO_EMAIL} with password "${DEMO_PASSWORD}".`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  // The whole error, not just .message: a refused connection has an empty one.
  console.error(error);
  process.exit(1);
});
