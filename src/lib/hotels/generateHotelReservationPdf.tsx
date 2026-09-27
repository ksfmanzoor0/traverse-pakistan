import { Document, Page, Text, View, Image, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs/promises";
import path from "node:path";

Font.registerHyphenationCallback((word) => [word]);

const GREEN = "#1E6A52";
const GREY = "#e5e7eb";
const GREY_TEXT = "#6b7280";
const BLACK = "#111111";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: BLACK,
    lineHeight: 1.35,
  },
  topRule: { borderTopWidth: 2, borderTopColor: GREEN, paddingTop: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { height: 48, width: 148, objectFit: "contain" },
  refBlock: { alignItems: "flex-end" },
  refLabel: { fontSize: 8.5, color: GREY_TEXT, letterSpacing: 0.6, textTransform: "uppercase" },
  refValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: BLACK, marginTop: 2 },
  statusPill: {
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: GREEN,
    marginTop: 18,
    marginBottom: 4,
  },
  subtitle: { fontSize: 10, color: GREY_TEXT, marginBottom: 18 },
  sectionLabel: {
    fontSize: 8.5,
    color: GREY_TEXT,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  gridRow: { flexDirection: "row", gap: 20, marginBottom: 16 },
  gridCol: { flex: 1 },
  card: {
    borderWidth: 1,
    borderColor: GREY,
    borderRadius: 4,
    padding: 12,
  },
  kv: { flexDirection: "row", marginBottom: 4 },
  kvLabel: { width: 82, color: GREY_TEXT, fontSize: 9.5 },
  kvValue: { flex: 1, color: BLACK, fontSize: 9.5 },
  kvValueBold: { flex: 1, color: BLACK, fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  table: { borderWidth: 1, borderColor: GREY, borderRadius: 4, marginTop: 4 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: GREY,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: GREY,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  th: { fontSize: 8.5, color: GREY_TEXT, fontFamily: "Helvetica-Bold", letterSpacing: 0.4, textTransform: "uppercase" },
  td: { fontSize: 10, color: BLACK },
  colRoom: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colRate: { flex: 1.4, textAlign: "right" },
  colTotal: { flex: 1.6, textAlign: "right" },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  totalsLabel: { fontSize: 9.5, color: GREY_TEXT },
  totalsValue: { fontSize: 10, color: BLACK },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f9fafb",
    borderTopWidth: 1,
    borderTopColor: GREY,
    borderRadius: 4,
  },
  grandTotalLabel: { fontSize: 11, color: BLACK, fontFamily: "Helvetica-Bold" },
  grandTotalValue: { fontSize: 12, color: GREEN, fontFamily: "Helvetica-Bold" },
  notesBlock: { marginTop: 16, padding: 12, borderRadius: 4, backgroundColor: "#f9fafb" },
  notesTitle: { fontSize: 9, color: GREY_TEXT, fontFamily: "Helvetica-Bold", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4 },
  notesBody: { fontSize: 9.5, color: BLACK, lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 20, left: 44, right: 44, borderTopWidth: 1, borderTopColor: GREY, paddingTop: 8 },
  footerText: { fontSize: 8.5, color: GREY_TEXT, textAlign: "center" },
  footerBrand: { fontSize: 9, color: GREEN, fontFamily: "Helvetica-Bold" },
});

async function loadPublicImage(rel: string): Promise<string | null> {
  try {
    const abs = path.join(process.cwd(), "public", rel);
    const buf = await fs.readFile(abs);
    const b64 = buf.toString("base64");
    const ext = rel.split(".").pop()?.toLowerCase() ?? "png";
    const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

export type HotelPdfRoom = {
  roomName: string;
  qty: number;
  adults: number;
  children: number;
  pricePerNight: number;
};

export type HotelReservationPdfInput = {
  bookingRef: string;
  bookingStatus: string;
  paymentStatus: string;
  hotelName: string;
  hotelLocation?: string | null;
  checkinDate: string;
  checkoutDate: string;
  nights: number;
  arrivalTime?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  adults: number;
  children: number;
  rooms: HotelPdfRoom[];
  totalAmount: number;
  currency: string;
  notes?: string | null;
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtMoney(n: number, currency: string): string {
  const rounded = Math.round(n);
  const withCommas = rounded.toLocaleString("en-PK");
  return `${currency} ${withCommas}`;
}

function statusTone(booking: string, payment: string): { label: string; bg: string; color: string } {
  const b = booking.toLowerCase();
  const p = payment.toLowerCase();
  if (b === "confirmed" || p === "paid") return { label: "Confirmed", bg: "#e7f5ef", color: GREEN };
  if (b === "cancelled") return { label: "Cancelled", bg: "#fee2e2", color: "#991b1b" };
  if (b === "refunded" || p === "refunded") return { label: "Refunded", bg: "#fef3c7", color: "#92400e" };
  if (p === "failed") return { label: "Payment failed", bg: "#fee2e2", color: "#991b1b" };
  return { label: "Pending", bg: "#fef3c7", color: "#92400e" };
}

export async function generateHotelReservationPdf(input: HotelReservationPdfInput): Promise<Buffer> {
  const logoData = await loadPublicImage("logo-day.png");
  const tone = statusTone(input.bookingStatus, input.paymentStatus);

  const roomsSubtotal = input.rooms.reduce(
    (acc, r) => acc + r.pricePerNight * r.qty * input.nights,
    0,
  );
  const taxesFees = Math.max(0, input.totalAmount - roomsSubtotal);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule}>
          <View style={styles.header}>
            {logoData ? <Image src={logoData} style={styles.logo} /> : <View style={styles.logo} />}
            <View style={styles.refBlock}>
              <Text style={styles.refLabel}>Booking reference</Text>
              <Text style={styles.refValue}>{input.bookingRef}</Text>
              <Text style={[styles.statusPill, { backgroundColor: tone.bg, color: tone.color }]}>
                {tone.label}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.title}>Hotel Reservation Voucher</Text>
        <Text style={styles.subtitle}>
          Present this voucher at check-in. For any changes or assistance, contact us anytime.
        </Text>

        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.sectionLabel}>Property</Text>
            <View style={styles.card}>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Hotel</Text>
                <Text style={styles.kvValueBold}>{input.hotelName}</Text>
              </View>
              {input.hotelLocation ? (
                <View style={styles.kv}>
                  <Text style={styles.kvLabel}>Location</Text>
                  <Text style={styles.kvValue}>{input.hotelLocation}</Text>
                </View>
              ) : null}
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Check-in</Text>
                <Text style={styles.kvValue}>{fmtDate(input.checkinDate)}</Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Check-out</Text>
                <Text style={styles.kvValue}>{fmtDate(input.checkoutDate)}</Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Nights</Text>
                <Text style={styles.kvValue}>{input.nights}</Text>
              </View>
              {input.arrivalTime ? (
                <View style={styles.kv}>
                  <Text style={styles.kvLabel}>Arrival</Text>
                  <Text style={styles.kvValue}>{input.arrivalTime}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.gridCol}>
            <Text style={styles.sectionLabel}>Guest</Text>
            <View style={styles.card}>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Name</Text>
                <Text style={styles.kvValueBold}>{input.contactName}</Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Email</Text>
                <Text style={styles.kvValue}>{input.contactEmail}</Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Phone</Text>
                <Text style={styles.kvValue}>{input.contactPhone}</Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Adults</Text>
                <Text style={styles.kvValue}>{input.adults}</Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.kvLabel}>Children</Text>
                <Text style={styles.kvValue}>{input.children}</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Rooms</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colRoom]}>Room</Text>
            <Text style={[styles.th, styles.colQty]}>Qty</Text>
            <Text style={[styles.th, styles.colRate]}>Rate / night</Text>
            <Text style={[styles.th, styles.colTotal]}>Line total ({input.nights}n)</Text>
          </View>
          {input.rooms.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1, color: GREY_TEXT }]}>
                Room details will be provided at check-in.
              </Text>
            </View>
          ) : (
            input.rooms.map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.colRoom}>
                  <Text style={styles.td}>{r.roomName}</Text>
                  <Text style={[styles.td, { fontSize: 8.5, color: GREY_TEXT }]}>
                    {r.adults} adult{r.adults === 1 ? "" : "s"}
                    {r.children > 0 ? ` · ${r.children} child` : ""}
                  </Text>
                </View>
                <Text style={[styles.td, styles.colQty]}>{r.qty}</Text>
                <Text style={[styles.td, styles.colRate]}>
                  {fmtMoney(r.pricePerNight, input.currency)}
                </Text>
                <Text style={[styles.td, styles.colTotal]}>
                  {fmtMoney(r.pricePerNight * r.qty * input.nights, input.currency)}
                </Text>
              </View>
            ))
          )}
        </View>

        {roomsSubtotal > 0 && taxesFees > 0.5 && (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Rooms subtotal</Text>
            <Text style={styles.totalsValue}>{fmtMoney(roomsSubtotal, input.currency)}</Text>
          </View>
        )}
        {taxesFees > 0.5 && (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Taxes and fees</Text>
            <Text style={styles.totalsValue}>{fmtMoney(taxesFees, input.currency)}</Text>
          </View>
        )}
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>{fmtMoney(input.totalAmount, input.currency)}</Text>
        </View>

        {input.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesBody}>{input.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Traverse Pakistan</Text>
          <Text style={styles.footerText}>
            Pakistan{"'"}s highest-rated tourism company · TripAdvisor Travellers{"'"} Choice 2025
          </Text>
          <Text style={styles.footerText}>
            info@traversepakistan.com · +92 321 6650670 · traversepakistan.com
          </Text>
        </View>
      </Page>
    </Document>
  );

  return await renderToBuffer(doc);
}
