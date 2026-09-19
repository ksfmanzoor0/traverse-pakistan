import { Document, Page, Text, View, Image, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import type { LetterData } from "./letterData";
import { getInvitationSignatureDataUrl } from "./config";
import { readTravelerName } from "./types";

// Suppress react-pdf's default hyphenation so plain words like "MANZOOR"
// don't get split with a "-" across lines. Line breaks for long names/IDs
// in table cells are handled explicitly by wrapForCell() below, which is
// far more predictable than the hyphenation engine.
Font.registerHyphenationCallback((word) => [word]);

/**
 * Force a line break for values that would overflow a narrow table cell.
 * Prefers hyphen breaks ("ONSTAD-BAULD" → "ONSTAD-\nBAULD"), then space
 * breaks (natural), then chunks every N chars as a last resort so a long
 * unbroken surname or passport ID can't spill into the next column.
 */
function wrapForCell(s: string, chunk = 10): string {
  if (!s) return s;
  if (s.length <= chunk) return s;
  if (s.includes("-")) return s.replace(/-/g, "-\n");
  if (/\s/.test(s)) return s;
  return s.replace(new RegExp(`(.{${chunk}})`, "g"), "$1\n").replace(/\n$/, "");
}

const GREEN = "#1E6A52";
const GREY = "#e5e7eb";
const BLACK = "#111111";

// Tiered sizing keeps the letter on a single A4 page regardless of traveller
// count. Each extra traveller adds ~18-20pt of table height at the compact
// tier, so we step down font + margins in bands rather than smoothly scaling
// (avoids sub-point sizes that render inconsistently).
//   ≤5 travellers : roomy layout, 10.5pt body
//   6-8           : mid, 9.5pt body
//   9+            : compact, 9pt body + tighter margins
function buildStyles(travellerCount: number) {
  const tier = travellerCount >= 9 ? "compact" : travellerCount >= 6 ? "mid" : "roomy";
  const body = tier === "compact" ? 9 : tier === "mid" ? 9.5 : 10.5;
  const tableFont = tier === "compact" ? 7.5 : tier === "mid" ? 8 : 9;
  const tablePad = tier === "compact" ? 2.5 : tier === "mid" ? 3 : 4;
  const para = tier === "compact" ? 4 : tier === "mid" ? 5 : 7;
  const section = tier === "compact" ? 8 : tier === "mid" ? 11 : 14;
  const signGap = tier === "compact" ? 12 : tier === "mid" ? 16 : 20;
  const lineH = tier === "compact" ? 1.25 : 1.3;
  return StyleSheet.create({
    page: { paddingTop: 22, paddingBottom: 18, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: body, color: BLACK, lineHeight: lineH },
    topRule: { borderTopWidth: 2, borderTopColor: GREEN, paddingTop: 8 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    logo: { height: 56, width: 172, objectFit: "contain" },
    addressBlock: { textAlign: "right", fontSize: 9.5, color: GREEN },
    addressLine: { marginBottom: 1 },
    metaBlock: { textAlign: "right", fontSize: 9.5, marginTop: 4, color: GREEN },
    metaNtn: { color: BLACK, marginTop: 2 },
    toBlock: { marginTop: section },
    subject: { marginTop: Math.round(section * 0.6) },
    subjectValue: { textDecoration: "underline" },
    paragraph: { marginTop: para },
    table: { marginTop: Math.round(para * 1.2), borderWidth: 1, borderColor: GREY },
    tr: { flexDirection: "row" },
    thCell: { padding: tablePad, fontSize: tableFont, backgroundColor: GREEN, color: "#ffffff", fontFamily: "Helvetica-Bold", textAlign: "center", borderRightWidth: 1, borderRightColor: GREEN },
    thCellLast: { padding: tablePad, fontSize: tableFont, backgroundColor: GREEN, color: "#ffffff", fontFamily: "Helvetica-Bold", textAlign: "center" },
    td: { padding: tablePad, fontSize: tableFont, borderRightWidth: 1, borderRightColor: GREY, borderTopWidth: 1, borderTopColor: GREY },
    tdLast: { padding: tablePad, fontSize: tableFont, borderTopWidth: 1, borderTopColor: GREY },
    signBlock: { marginTop: section },
    signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: Math.round(section * 0.6) },
    signLine: { width: 200, borderTopWidth: 1, borderTopColor: BLACK, marginTop: signGap },
    signLabel: { fontSize: 10, marginTop: 2 },
    dateText: { fontSize: body },
    pageNumber: { position: "absolute", bottom: 14, right: 44, fontSize: 9, color: "#6b7280" },
  });
}

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

export type PdfOptions = {
  /** Override the signature image. If undefined, falls back to the admin default. */
  signatureDataUrl?: string | null;
  /** If true, skip the signature image entirely (blank signature line for wet-signing). */
  omitSignature?: boolean;
};

export async function generateInvitationLetterPdf(
  data: LetterData,
  options: PdfOptions = {},
): Promise<Buffer> {
  const [logoData, storedDefault, filePng] = await Promise.all([
    loadPublicImage("logo-day.png"),
    options.signatureDataUrl === undefined ? getInvitationSignatureDataUrl() : Promise.resolve<string | null>(null),
    loadPublicImage("signature.png"),
  ]);
  // Precedence: explicit override (including null-to-clear) > admin default > bundled PNG.
  // omitSignature short-circuits all of that so the caller can produce a wet-sign copy.
  const signatureData = options.omitSignature
    ? null
    : options.signatureDataUrl !== undefined
      ? options.signatureDataUrl
      : storedDefault ?? filePng;
  const styles = buildStyles(data.travelers.length);

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule}>
          <View style={styles.headerRow}>
            {logoData ? <Image src={logoData} style={styles.logo} /> : <View style={styles.logo} />}
            <View>
              <View style={styles.addressBlock}>
                <Text style={styles.addressLine}>{data.header.address_line_1}</Text>
                <Text style={styles.addressLine}>{data.header.address_line_2}</Text>
                <Text style={styles.addressLine}>{data.header.city}</Text>
                <Text style={styles.addressLine}>{data.header.phone}</Text>
                {data.header.email && <Text style={styles.addressLine}>{data.header.email}</Text>}
                {data.header.website && <Text style={styles.addressLine}>{data.header.website}</Text>}
              </View>
              <View style={styles.metaBlock}>
                <Text>DTS Licence ID: {data.header.dts_licence}</Text>
                <Text>SECP Incorporation #: {data.header.secp_incorporation}</Text>
                <Text style={styles.metaNtn}>NTN: {data.header.ntn}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.toBlock}>
          <Text>To</Text>
          <Text>{data.addressee_name}</Text>
          <Text>{data.embassy_name}</Text>
        </View>

        <View style={styles.subject}>
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Subject: </Text>
            <Text style={styles.subjectValue}>{data.subject}</Text>
          </Text>
        </View>

        {data.body_intro.split(/\n{2,}/).map((para, i) => (
          <Text key={i} style={styles.paragraph}>{para}</Text>
        ))}

        {(() => {
          // Weighted column widths — names get more room since surnames like
          // "ONSTAD-BAULD" would otherwise overflow into the DOB column.
          // Dates are fixed-width (10 chars) so they can be tighter.
          const COL_FLEX = [1.3, 1.7, 1.0, 1.0, 1.3, 0.9];
          return (
            <View style={styles.table}>
              <View style={styles.tr}>
                {["First Name", "Surname", "Date of Birth", "Nationality", "Passport No.", "Expiry Date"].map((h, i, arr) => (
                  <Text key={h} style={[i === arr.length - 1 ? styles.thCellLast : styles.thCell, { flex: COL_FLEX[i] }]}>{h}</Text>
                ))}
              </View>
              {data.travelers.map((t, i) => {
                const { surname, first_name } = readTravelerName(t);
                // Names + passport numbers get explicit line breaks when
                // they're long enough to overflow their cell — see
                // wrapForCell(). Dates + nationality are short enough to
                // pass through untouched.
                const cells = [
                  wrapForCell(first_name.toUpperCase()),
                  wrapForCell(surname.toUpperCase()),
                  t.date_of_birth,
                  t.nationality,
                  wrapForCell(t.passport_number, 12),
                  t.passport_expiry,
                ];
                return (
                  <View key={i} style={styles.tr}>
                    {cells.map((c, j) => (
                      <Text key={j} style={[j === cells.length - 1 ? styles.tdLast : styles.td, { flex: COL_FLEX[j] }]}>{c}</Text>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })()}

        <Text style={styles.paragraph}>{data.body_close}</Text>

        <View style={styles.signBlock} wrap={false}>
          <Text>{data.signer_name}</Text>
          <Text>{data.signer_title}</Text>
          <View style={{ ...styles.signRow, alignItems: "flex-start" }} wrap={false}>
            <View style={{ width: 220 }} wrap={false}>
              <Text style={{ fontSize: 10, marginBottom: 4 }}>Signature:</Text>
              <View style={{ alignItems: "center", width: 220 }} wrap={false}>
                {signatureData && (
                  // Double-render with a sub-pixel offset thickens the stroke
                  // without needing the admin to upload a bolder image.
                  <View style={{ position: "relative", width: 180, height: 44, marginBottom: -3 }}>
                    <Image src={signatureData} style={{ position: "absolute", top: 0, left: 0, height: 44, width: 180, objectFit: "contain" }} />
                    <Image src={signatureData} style={{ position: "absolute", top: 0, left: 0.7, height: 44, width: 180, objectFit: "contain" }} />
                    <Image src={signatureData} style={{ position: "absolute", top: 0.5, left: 0, height: 44, width: 180, objectFit: "contain" }} />
                  </View>
                )}
                <View style={{ width: 180, borderTopWidth: 1, borderTopColor: BLACK, marginTop: signatureData ? 0 : 20 }} />
              </View>
            </View>
            <Text style={styles.dateText}>Date: {data.issued_date}</Text>
          </View>
        </View>

        <Text style={styles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} fixed />
      </Page>
    </Document>
  );

  return await renderToBuffer(doc);
}
