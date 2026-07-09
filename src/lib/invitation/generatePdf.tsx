import { Document, Page, Text, View, Image, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import type { LetterData } from "./letterData";
import { getInvitationSignatureDataUrl } from "./config";
import { readTravelerName } from "./types";

// Prevent react-pdf's default hyphenation from breaking words like
// "MANZOOR" across lines with a "-".
Font.registerHyphenationCallback((word) => [word]);

const GREEN = "#1E6A52";
const GREY = "#e5e7eb";
const BLACK = "#111111";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 11, color: BLACK, lineHeight: 1.4 },
  topRule: { borderTopWidth: 2, borderTopColor: GREEN, paddingTop: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { height: 68, width: 200, objectFit: "contain" },
  addressBlock: { textAlign: "right", fontSize: 10, color: GREEN },
  addressLine: { marginBottom: 1 },
  metaBlock: { textAlign: "right", fontSize: 10, marginTop: 8, color: GREEN },
  metaNtn: { color: BLACK, marginTop: 2 },
  toBlock: { marginTop: 28 },
  subject: { marginTop: 16 },
  subjectValue: { textDecoration: "underline" },
  paragraph: { marginTop: 12 },
  table: { marginTop: 14, borderWidth: 1, borderColor: GREY },
  tr: { flexDirection: "row" },
  thCell: { flex: 1, padding: 6, backgroundColor: GREEN, color: "#ffffff", fontFamily: "Helvetica-Bold", textAlign: "center", borderRightWidth: 1, borderRightColor: GREEN },
  thCellLast: { flex: 1, padding: 6, backgroundColor: GREEN, color: "#ffffff", fontFamily: "Helvetica-Bold", textAlign: "center" },
  td: { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: GREY, borderTopWidth: 1, borderTopColor: GREY },
  tdLast: { flex: 1, padding: 6, borderTopWidth: 1, borderTopColor: GREY },
  signBlock: { marginTop: 32 },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  signLine: { width: 200, borderTopWidth: 1, borderTopColor: BLACK, marginTop: 44 },
  signLabel: { fontSize: 10, marginTop: 2 },
  dateText: { fontSize: 11 },
  pageNumber: { position: "absolute", bottom: 20, right: 48, fontSize: 9, color: "#6b7280" },
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

export async function generateInvitationLetterPdf(data: LetterData): Promise<Buffer> {
  const [logoData, stored, filePng] = await Promise.all([
    loadPublicImage("logo-day.png"),
    getInvitationSignatureDataUrl(),
    loadPublicImage("signature.png"),
  ]);
  const signatureData = stored ?? filePng;

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

        <View style={styles.table}>
          <View style={styles.tr}>
            {["First Name", "Surname", "Date of Birth", "Nationality", "Passport No.", "Expiry Date"].map((h, i, arr) => (
              <Text key={h} style={i === arr.length - 1 ? styles.thCellLast : styles.thCell}>{h}</Text>
            ))}
          </View>
          {data.travelers.map((t, i) => {
            const { surname, first_name } = readTravelerName(t);
            return (
              <View key={i} style={styles.tr}>
                <Text style={styles.td}>{first_name.toUpperCase()}</Text>
                <Text style={styles.td}>{surname.toUpperCase()}</Text>
                <Text style={styles.td}>{t.date_of_birth}</Text>
                <Text style={styles.td}>{t.nationality}</Text>
                <Text style={styles.td}>{t.passport_number}</Text>
                <Text style={styles.tdLast}>{t.passport_expiry}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.paragraph}>{data.body_close}</Text>

        <View style={styles.signBlock} wrap={false}>
          <Text>{data.signer_name}</Text>
          <Text>{data.signer_title}</Text>
          <View style={{ ...styles.signRow, alignItems: "flex-start" }} wrap={false}>
            <View style={{ width: 220 }} wrap={false}>
              <Text style={{ fontSize: 10, marginBottom: 4 }}>Signature:</Text>
              <View style={{ alignItems: "center", width: 220 }} wrap={false}>
                {signatureData && (
                  <Image src={signatureData} style={{ height: 60, width: 200, objectFit: "contain", marginBottom: -4 }} />
                )}
                <View style={{ width: 200, borderTopWidth: 1, borderTopColor: BLACK, marginTop: signatureData ? 0 : 44 }} />
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
