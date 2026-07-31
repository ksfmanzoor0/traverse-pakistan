import { Document, Page, Text, View, Image, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import type { Package, PackageItinerary, PackageTier } from "@/types/package";
import type { Hotel } from "@/types/hotel";
import type { PackageBookingSnapshot } from "@/types/packageBookingSnapshot";

export interface PdfBookingContext {
  bookingRef: string;
  contactName?: string | null;
  tier: PackageTier;
  departureCity: string;
  startDate?: string | null;
  adults: number;
  rooms: number;
  snapshot?: PackageBookingSnapshot | null;
}

Font.registerHyphenationCallback((word) => [word]);

const GREEN = "#1E6A52";
const GREEN_SOFT = "#F1F7F4";
const GREY_BORDER = "#e5e7eb";
const GREY_TEXT = "#6b7280";
const BLACK = "#111111";

const styles = StyleSheet.create({
  page: {
    paddingTop: 32, paddingBottom: 40, paddingHorizontal: 40,
    fontFamily: "Helvetica", fontSize: 10, color: BLACK, lineHeight: 1.4,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: GREEN, paddingBottom: 10 },
  logo: { height: 40, width: 150, objectFit: "contain" },
  brandMeta: { textAlign: "right", fontSize: 9, color: GREEN, lineHeight: 1.5 },

  coverBlock: { marginTop: 22 },
  eyebrow: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN, letterSpacing: 1.2 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: BLACK, marginTop: 6, lineHeight: 1.2 },
  route: { fontSize: 11, color: GREY_TEXT, marginTop: 6 },

  metaGrid: { flexDirection: "row", marginTop: 18, backgroundColor: GREEN_SOFT, borderRadius: 4, padding: 12 },
  metaCell: { flex: 1 },
  metaLabel: { fontSize: 8, color: GREY_TEXT, letterSpacing: 0.8, textTransform: "uppercase" },
  metaValue: { fontSize: 11, color: BLACK, marginTop: 3, fontFamily: "Helvetica-Bold" },

  section: { marginTop: 22 },
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GREEN, borderBottomWidth: 1, borderBottomColor: GREEN, paddingBottom: 4 },

  day: { marginTop: 14, paddingLeft: 44, position: "relative" },
  dayBadge: { position: "absolute", left: 0, top: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  dayBadgeNum: { color: "#ffffff", fontSize: 11, fontFamily: "Helvetica-Bold" },
  dayBadgeLbl: { color: "#ffffff", fontSize: 6, letterSpacing: 0.5 },
  dayTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: BLACK },
  dayMeta: { fontSize: 9, color: GREY_TEXT, marginTop: 2 },
  dayDesc: { fontSize: 10, marginTop: 6, color: BLACK },

  hotelRow: { flexDirection: "row", marginTop: 8, gap: 8 },
  hotelCard: { flex: 1, borderWidth: 1, borderColor: GREY_BORDER, borderRadius: 3, padding: 8 },
  hotelTier: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GREEN, letterSpacing: 0.8 },
  hotelName: { fontSize: 10, color: BLACK, marginTop: 2, fontFamily: "Helvetica-Bold" },
  hotelLoc: { fontSize: 8, color: GREY_TEXT, marginTop: 1 },

  listItem: { flexDirection: "row", marginTop: 5 },
  listBullet: { width: 12, color: GREEN, fontFamily: "Helvetica-Bold" },
  listText: { flex: 1, color: BLACK },

  footer: { position: "absolute", bottom: 20, left: 40, right: 40, borderTopWidth: 1, borderTopColor: GREY_BORDER, paddingTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerText: { fontSize: 8, color: GREY_TEXT },
  footerBrand: { fontSize: 8, color: GREEN, fontFamily: "Helvetica-Bold" },
  pageNumber: { fontSize: 8, color: GREY_TEXT },
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

function formatCityLabel(city: string): string {
  return city.charAt(0).toUpperCase() + city.slice(1);
}

interface PdfArgs {
  pkg: Package;
  itinerary: PackageItinerary | null;
  hotelsBySlug: Map<string, Hotel>;
  booking?: PdfBookingContext;
}

function formatBookingDate(iso?: string | null): string {
  if (!iso) return "TBD";
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });
}

interface RenderDay {
  dayNumber: number;
  title: string;
  description: string;
  stops: { name: string; detail: string }[];
  overnight: string;
  drivingTime: string;
  hotelMode: "dual" | "single";
  deluxeHotelSlug: string;
  luxuryHotelSlug: string;
  bookedHotelSlug: string;
}

export async function generatePackageItineraryPdf({ pkg, itinerary, hotelsBySlug, booking }: PdfArgs): Promise<Buffer> {
  const logoData = await loadPublicImage("logo-day.png");
  const snapshot = booking?.snapshot ?? null;
  const tierPricing = pkg.tiers?.deluxe ?? pkg.tiers?.luxury;
  const startingCities = (
    ["islamabad", "lahore", "karachi"] as const
  )
    .filter((city) => tierPricing?.[city] != null)
    .map(formatCityLabel)
    .join(" · ") || "Islamabad";

  // Days come from snapshot when present (booked + admin-tweakable),
  // else standard package itinerary. Normalize into RenderDay shape so
  // the loop below is agnostic.
  const renderDays: RenderDay[] = snapshot
    ? snapshot.days.map((d) => ({
        dayNumber: d.dayNumber,
        title: d.title,
        description: d.description,
        stops: d.stops ?? [],
        overnight: d.overnight,
        drivingTime: d.drivingTime,
        hotelMode: "single",
        deluxeHotelSlug: "",
        luxuryHotelSlug: "",
        bookedHotelSlug: d.hotelSlug,
      }))
    : (itinerary?.days ?? []).map((d) => ({
        dayNumber: d.dayNumber,
        title: d.title,
        description: d.description,
        stops: d.stops ?? [],
        overnight: d.overnight,
        drivingTime: d.drivingTime,
        hotelMode: booking ? "single" : "dual",
        deluxeHotelSlug: d.hotels?.deluxe ?? "",
        luxuryHotelSlug: d.hotels?.luxury ?? "",
        bookedHotelSlug: booking?.tier === "luxury" ? (d.hotels?.luxury ?? "") : (d.hotels?.deluxe ?? ""),
      }));

  // Inclusions / exclusions come from snapshot when present, else package.
  const inclusions = snapshot?.inclusions ?? pkg.inclusions ?? [];
  const exclusions = snapshot?.exclusions ?? pkg.exclusions ?? [];

  const doc = (
    <Document title={`${pkg.name} — Itinerary`} author="Traverse Pakistan">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {logoData ? (
            <Image src={logoData} style={styles.logo} />
          ) : (
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: GREEN }}>TRAVERSE PAKISTAN</Text>
          )}
          <View style={styles.brandMeta}>
            <Text>traversepakistan.com</Text>
            <Text>+92-321-6650670 · WhatsApp</Text>
            <Text>Office E-11/1, Islamabad</Text>
          </View>
        </View>

        {/* Cover */}
        <View style={styles.coverBlock}>
          <Text style={styles.eyebrow}>{booking ? "YOUR ITINERARY" : "PACKAGE ITINERARY"}</Text>
          <Text style={styles.title}>{pkg.name}</Text>
          {pkg.route && <Text style={styles.route}>{pkg.route}</Text>}
        </View>

        {/* Trip meta grid */}
        {booking ? (
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Start date</Text>
              <Text style={styles.metaValue}>{formatBookingDate(booking.startDate)}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Duration</Text>
              <Text style={styles.metaValue}>{pkg.duration} {pkg.duration === 1 ? "day" : "days"}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Tier</Text>
              <Text style={styles.metaValue}>{booking.tier.charAt(0).toUpperCase() + booking.tier.slice(1)}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Departure</Text>
              <Text style={styles.metaValue}>{formatCityLabel(booking.departureCity)}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Travellers</Text>
              <Text style={styles.metaValue}>{booking.adults} adults · {booking.rooms} rooms</Text>
            </View>
          </View>
        ) : (
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Duration</Text>
              <Text style={styles.metaValue}>{pkg.duration} {pkg.duration === 1 ? "day" : "days"}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Starting cities</Text>
              <Text style={styles.metaValue}>{startingCities}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Tiers available</Text>
              <Text style={styles.metaValue}>Deluxe · Luxury</Text>
            </View>
          </View>
        )}

        {booking && (
          <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: GREY_TEXT }}>
            <Text>Booking ref: <Text style={{ color: BLACK, fontFamily: "Helvetica-Bold" }}>{booking.bookingRef}</Text></Text>
            {booking.contactName && <Text>Prepared for: <Text style={{ color: BLACK, fontFamily: "Helvetica-Bold" }}>{booking.contactName}</Text></Text>}
          </View>
        )}

        {/* Day-by-day itinerary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Day-by-day itinerary</Text>
          {renderDays.length === 0 ? (
            <Text style={{ marginTop: 12, color: GREY_TEXT, fontStyle: "italic" }}>
              Detailed day-by-day itinerary will be shared on request. WhatsApp us for the full plan.
            </Text>
          ) : (
            renderDays.map((day) => {
              const deluxeHotel = hotelsBySlug.get(day.deluxeHotelSlug);
              const luxuryHotel = hotelsBySlug.get(day.luxuryHotelSlug);
              const bookedHotel = hotelsBySlug.get(day.bookedHotelSlug);
              return (
                <View key={day.dayNumber} style={styles.day} wrap={false}>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeLbl}>DAY</Text>
                    <Text style={styles.dayBadgeNum}>{day.dayNumber}</Text>
                  </View>
                  <Text style={styles.dayTitle}>{day.title}</Text>
                  {(day.overnight || day.drivingTime) && (
                    <Text style={styles.dayMeta}>
                      {[day.overnight && `Overnight: ${day.overnight}`, day.drivingTime && `Drive: ${day.drivingTime}`].filter(Boolean).join("   ·   ")}
                    </Text>
                  )}
                  {day.description && <Text style={styles.dayDesc}>{day.description}</Text>}
                  {day.stops && day.stops.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                      {day.stops.map((stop, i) => (
                        <View key={i} style={styles.listItem}>
                          <Text style={styles.listBullet}>•</Text>
                          <Text style={styles.listText}>
                            <Text style={{ fontFamily: "Helvetica-Bold" }}>{stop.name}</Text>
                            {stop.detail ? ` — ${stop.detail}` : ""}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {day.hotelMode === "single" && bookedHotel && (
                    <View style={styles.hotelRow}>
                      <View style={styles.hotelCard}>
                        <Text style={styles.hotelTier}>{(booking?.tier ?? "").toUpperCase()} STAY</Text>
                        <Text style={styles.hotelName}>{bookedHotel.name}</Text>
                        {bookedHotel.location && <Text style={styles.hotelLoc}>{bookedHotel.location}</Text>}
                      </View>
                    </View>
                  )}
                  {day.hotelMode === "dual" && (deluxeHotel || luxuryHotel) && (
                    <View style={styles.hotelRow}>
                      <View style={styles.hotelCard}>
                        <Text style={styles.hotelTier}>DELUXE STAY</Text>
                        <Text style={styles.hotelName}>{deluxeHotel?.name ?? "TBD"}</Text>
                        {deluxeHotel?.location && <Text style={styles.hotelLoc}>{deluxeHotel.location}</Text>}
                      </View>
                      <View style={styles.hotelCard}>
                        <Text style={styles.hotelTier}>LUXURY STAY</Text>
                        <Text style={styles.hotelName}>{luxuryHotel?.name ?? "TBD"}</Text>
                        {luxuryHotel?.location && <Text style={styles.hotelLoc}>{luxuryHotel.location}</Text>}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Inclusions */}
        {inclusions.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>What&apos;s included</Text>
            {inclusions.map((line, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={styles.listBullet}>✓</Text>
                <Text style={styles.listText}>{line}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Exclusions */}
        {exclusions.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>What&apos;s not included</Text>
            {exclusions.map((line, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={{ ...styles.listBullet, color: GREY_TEXT }}>×</Text>
                <Text style={styles.listText}>{line}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerBrand}>Traverse Pakistan · 4.9★ · 1,300+ reviews</Text>
          <Text style={styles.footerText}>WhatsApp: +92-321-6650670</Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
