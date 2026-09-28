import { Document, Page, Text, View, Image, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs/promises";
import path from "node:path";

Font.registerHyphenationCallback((word) => [word]);

const BLACK = "#111111";
const GREY_TEXT = "#6b7280";
const BODY_GREY = "#4b5563";
const HAIRLINE = "#e5e7eb";
const GREEN = "#1E6A52";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: BODY_GREY,
    lineHeight: 1.5,
  },
  heroWrap: { position: "relative", width: "100%", height: 260 },
  hero: { width: "100%", height: 260, objectFit: "cover" },
  heroPlaceholder: { width: "100%", height: 32, backgroundColor: GREEN },
  logoOnHero: {
    position: "absolute",
    left: 40,
    bottom: 22,
    height: 76,
    width: 200,
    objectFit: "contain",
  },
  contentPad: { paddingTop: 36, paddingHorizontal: 56 },
  greeting: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: BLACK,
    marginBottom: 6,
  },
  intro: { fontSize: 14, color: BODY_GREY, marginBottom: 40 },
  columns: { flexDirection: "row", gap: 40 },
  colLeft: { flex: 1 },
  colRight: { flex: 1.2 },
  hotelName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 22 },
  metaBlock: { marginTop: 12 },
  metaLine: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: BODY_GREY,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  rightLine: { fontSize: 13, color: BODY_GREY, marginBottom: 4 },
  rightAmp: { fontSize: 13, color: BODY_GREY, marginBottom: 6 },
  statusRow: { marginTop: 18, flexDirection: "row", alignItems: "flex-start", gap: 6, flexWrap: "wrap" },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    marginTop: 40,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: GREY_TEXT,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  notesBody: { fontSize: 11, color: BODY_GREY, lineHeight: 1.45 },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 10,
  },
  footerBrand: { fontSize: 10, fontFamily: "Helvetica-Bold", color: GREEN, textAlign: "center" },
  footerText: { fontSize: 9, color: GREY_TEXT, textAlign: "center", marginTop: 2 },
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

async function loadRemoteImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    // Cap at ~1MB to keep the PDF small; if the source is huge just skip.
    if (buf.byteLength > 1_500_000) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Destination cover image URL — R2/media host. Tries the destination slug
 * first, then falls back to jpg then null. Caller handles null gracefully.
 */
function destinationCoverUrl(destinationSlug: string | null | undefined): string | null {
  if (!destinationSlug) return null;
  return `https://media.traversepakistan.com/destinations/${destinationSlug}/cover.jpg`;
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
  reservationCode?: string | null;
  bookingStatus: string;
  paymentStatus: string;
  hotelName: string;
  hotelLocation?: string | null;
  destinationSlug?: string | null;
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
  breakfastIncluded?: boolean;
};

function fmtDateShort(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type Pill = { label: string; bg: string; color: string };

const PILL_SUCCESS = { bg: "#e7f5ef", color: GREEN };
const PILL_WARN = { bg: "#fef3c7", color: "#92400e" };
const PILL_ERROR = { bg: "#fee2e2", color: "#991b1b" };
const PILL_NEUTRAL = { bg: "#f3f4f6", color: "#4b5563" };

function bookingStatusPill(status: string): Pill {
  const s = status.toLowerCase();
  if (s === "confirmed") return { label: "Booking: Confirmed", ...PILL_SUCCESS };
  if (s === "cancelled") return { label: "Booking: Cancelled", ...PILL_ERROR };
  if (s === "refunded") return { label: "Booking: Refunded", ...PILL_WARN };
  return { label: "Booking: Pending", ...PILL_WARN };
}

function paymentStatusPill(status: string): Pill {
  const s = status.toLowerCase();
  if (s === "paid") return { label: "Payment: Paid", ...PILL_SUCCESS };
  if (s === "failed") return { label: "Payment: Failed", ...PILL_ERROR };
  if (s === "refunded") return { label: "Payment: Refunded", ...PILL_WARN };
  if (s === "deposit_paid") return { label: "Payment: Deposit paid", ...PILL_SUCCESS };
  if (s === "pending" || !s) return { label: "Payment: Pending", ...PILL_WARN };
  return { label: `Payment: ${status}`, ...PILL_NEUTRAL };
}

/** Build "1 x Deluxe Room / 1 x Deluxe Family Room" style entries. */
function roomLabelLines(rooms: HotelPdfRoom[]): string[] {
  if (rooms.length === 0) return ["Room to be assigned at check-in"];
  return rooms.map((r) => `${r.qty} x ${r.roomName}`);
}

/** Occupancy line: "9 Adults, 1 Child" */
function occupancyLine(adults: number, children: number): string {
  const parts: string[] = [];
  parts.push(`${adults} Adult${adults === 1 ? "" : "s"}`);
  if (children > 0) parts.push(`${children} Child${children === 1 ? "" : "ren"}`);
  return parts.join(", ");
}

/**
 * Return the guest's full name, title-cased word by word so
 * "ott rabi" → "Ott Rabi" and "MS MARIA QAZI" → "Ms Maria Qazi".
 * Recognised salutations (Mr/Ms/Mrs/Miss/Dr/Sir/Madam) are kept in
 * their conventional capitalisation.
 */
function greetingFromName(fullName: string): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return "Guest";
  const titles: Record<string, string> = {
    mr: "Mr", "mr.": "Mr", ms: "Ms", "ms.": "Ms",
    mrs: "Mrs", "mrs.": "Mrs", miss: "Miss",
    dr: "Dr", "dr.": "Dr", sir: "Sir", madam: "Madam",
  };
  return trimmed
    .split(/\s+/)
    .map((word) => {
      const bare = word.toLowerCase();
      if (titles[bare]) return titles[bare];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export async function generateHotelReservationPdf(input: HotelReservationPdfInput): Promise<Buffer> {
  const heroUrl = destinationCoverUrl(input.destinationSlug);
  const [logoData, heroData] = await Promise.all([
    loadPublicImage("logo-white.png"),
    heroUrl ? loadRemoteImage(heroUrl) : Promise.resolve<string | null>(null),
  ]);
  const bookingPill = bookingStatusPill(input.bookingStatus);
  const paymentPill = paymentStatusPill(input.paymentStatus);

  const roomLines = roomLabelLines(input.rooms);
  const dateRange = `${fmtDateShort(input.checkinDate)} - ${fmtDateShort(input.checkoutDate)}`;
  const occupancy = occupancyLine(input.adults, input.children);
  const breakfast = input.breakfastIncluded !== false;

  const fullName = greetingFromName(input.contactName);
  const bookingNameUpper = (input.contactName ?? "Guest").toUpperCase();

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {heroData ? (
          <View style={styles.heroWrap}>
            <Image src={heroData} style={styles.hero} />
            {logoData ? <Image src={logoData} style={styles.logoOnHero} /> : null}
          </View>
        ) : (
          <View style={styles.heroPlaceholder} />
        )}

        <View style={styles.contentPad}>
        <Text style={styles.greeting}>Dear {fullName},</Text>
        <Text style={styles.intro}>
          We are pleased to confirm following reservations with Traverse Pakistan.
        </Text>

        <View style={styles.columns}>
          <View style={styles.colLeft}>
            <Text style={styles.hotelName}>
              {input.hotelName}
              {input.hotelLocation ? `, ${input.hotelLocation}` : ""}
            </Text>

            <View style={styles.metaBlock}>
              <Text style={styles.metaLine}>Booking Name: Traverse Pakistan</Text>
              <Text style={styles.metaLine}>Guest Name: {bookingNameUpper}</Text>
              <Text style={styles.metaLine}>Booking Reference # {input.bookingRef}</Text>
              {input.reservationCode ? (
                <Text style={styles.metaLine}>Reservation Code: {input.reservationCode}</Text>
              ) : null}
            </View>

            <View style={styles.statusRow}>
              <Text style={[styles.statusPill, { backgroundColor: bookingPill.bg, color: bookingPill.color }]}>
                {bookingPill.label}
              </Text>
              <Text style={[styles.statusPill, { backgroundColor: paymentPill.bg, color: paymentPill.color }]}>
                {paymentPill.label}
              </Text>
            </View>
          </View>

          <View style={styles.colRight}>
            <Text style={styles.rightAmp}>{dateRange} &</Text>
            {roomLines.map((line, i) => (
              <Text key={i} style={styles.rightLine}>
                {line}
              </Text>
            ))}
            <Text style={[styles.rightLine, { marginTop: 6 }]}>Occupancy: {occupancy}</Text>
            {breakfast && (
              <Text style={styles.rightLine}>Breakfast Included for: {occupancy}</Text>
            )}
            {input.arrivalTime ? (
              <Text style={[styles.rightLine, { marginTop: 6, color: GREY_TEXT }]}>
                Expected arrival: {input.arrivalTime}
              </Text>
            ) : null}
          </View>
        </View>

        {input.notes ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesBody}>{input.notes}</Text>
          </>
        ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBrand}>Traverse Pakistan</Text>
          <Text style={styles.footerText}>
            info@traversepakistan.com{"    "}·{"    "}+92 321 6650670{"    "}·{"    "}traversepakistan.com
          </Text>
        </View>
      </Page>
    </Document>
  );

  return await renderToBuffer(doc);
}
