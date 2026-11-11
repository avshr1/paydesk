import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Client, Invoice, LineItem } from "@/generated/prisma/client";
import { formatDate } from "@/lib/dates";
import {
  formatQuantity,
  formatStatus,
  formatTaxRate,
} from "@/lib/invoice-format";
import { formatCents } from "@/lib/money";

export type InvoicePdfData = {
  invoice: Invoice & { client: Client; lineItems: LineItem[] };
  from: { name: string | null; email: string };
};

const ink = "#18181b";
const muted = "#71717a";
const rule = "#e4e4e7";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: ink, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between" },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  number: { fontSize: 12, marginTop: 4 },
  status: { fontSize: 10, color: muted, marginTop: 2 },
  amountLabel: { color: muted, textAlign: "right" },
  amount: { fontSize: 18, fontFamily: "Helvetica-Bold", textAlign: "right" },
  parties: { flexDirection: "row", marginTop: 32, gap: 32 },
  party: { flex: 1, gap: 2 },
  label: { fontSize: 8, color: muted, marginBottom: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 32 },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: rule,
  },
  headRow: { borderBottomColor: ink },
  description: { flex: 1, paddingRight: 8 },
  amountCol: { width: 70, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 220, gap: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: ink,
    paddingTop: 6,
    marginTop: 2,
  },
  notes: { marginTop: 32 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: muted,
  },
});

function InvoicePdf({ invoice, from }: InvoicePdfData) {
  // formatCents everywhere, so the PDF matches the app to the cent.
  const money = (cents: number) => formatCents(cents, invoice.currency);
  const { client } = invoice;

  return (
    <Document
      title={`Invoice ${invoice.number}`}
      author={from.name ?? from.email}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.number}>{invoice.number}</Text>
            <Text style={styles.status}>
              {formatStatus(invoice.status)} · Issued{" "}
              {formatDate(invoice.issueDate)} · Due{" "}
              {formatDate(invoice.dueDate)}
            </Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>
              {invoice.status === "PAID" ? "Paid" : "Amount due"}
            </Text>
            <Text style={styles.amount}>{money(invoice.totalCents)}</Text>
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.label}>FROM</Text>
            {from.name && <Text style={styles.bold}>{from.name}</Text>}
            <Text>{from.email}</Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.label}>BILL TO</Text>
            <Text style={styles.bold}>{client.name}</Text>
            {client.company && <Text>{client.company}</Text>}
            <Text>{client.email}</Text>
            {client.address && <Text>{client.address}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.description, styles.bold]}>Description</Text>
            <Text style={[styles.amountCol, styles.bold]}>Qty</Text>
            <Text style={[styles.amountCol, styles.bold]}>Unit price</Text>
            <Text style={[styles.amountCol, styles.bold]}>Amount</Text>
          </View>
          {invoice.lineItems.map((item) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.amountCol}>
                {formatQuantity(item.quantityHundredths)}
              </Text>
              <Text style={styles.amountCol}>{money(item.unitPriceCents)}</Text>
              <Text style={styles.amountCol}>{money(item.amountCents)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <Text style={{ color: muted }}>Subtotal</Text>
            <Text>{money(invoice.subtotalCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={{ color: muted }}>
              Tax ({formatTaxRate(invoice.taxRateBps)})
            </Text>
            <Text>{money(invoice.taxCents)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.bold}>Total</Text>
            <Text style={styles.bold}>{money(invoice.totalCents)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.label}>NOTES</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer} fixed>
          Generated by Paydesk
        </Text>
      </Page>
    </Document>
  );
}

export function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoicePdf {...data} />);
}
