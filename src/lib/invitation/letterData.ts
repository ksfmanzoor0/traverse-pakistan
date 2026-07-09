import type { Traveler, InvitationRequest } from "./types";

export type LetterData = {
  header: {
    address_line_1: string;
    address_line_2: string;
    city: string;
    phone: string;
    email: string;
    website: string;
    dts_licence: string;
    secp_incorporation: string;
    ntn: string;
  };
  addressee_name: string;
  embassy_name: string;
  subject: string;
  body_intro: string;
  body_close: string;
  travelers: Traveler[];
  signer_name: string;
  signer_title: string;
  issued_date: string;
};

export function defaultLetterData(row: InvitationRequest): LetterData {
  const destList = (row.destinations ?? []).join(", ") || "[destinations]";
  const arrivalFmt = row.arrival_date ? formatDate(row.arrival_date) : "[arrival date]";
  const departureFmt = row.departure_date ? formatDate(row.departure_date) : "[departure date]";
  return {
    header: {
      address_line_1: "Shop 06, Multi Arcade,",
      address_line_2: "MPCHS, E-11/1,",
      city: "Islamabad",
      phone: "92-335-1589132",
      email: "info@traversepakistan.com",
      website: "traversepakistan.com",
      dts_licence: "2493",
      secp_incorporation: "0137385",
      ntn: "6561399",
    },
    addressee_name: "Visa Counsellor,",
    embassy_name: `Embassy of Pakistan, ${row.embassy_city ?? "[city]"}`,
    subject: "Issuance of Tourist Visa",
    body_intro: `Traverse Pakistan with official name of "TRAVERSE PAK LLP" is a licensed Travel Agency registered with DTS, Islamabad; is pleased to formally invite the below-listed Participants to the Islamic Republic of Pakistan for a guided tourism experience across the ${destList} regions from ${arrivalFmt} to ${departureFmt}.\n\nM/S Traverse Pak LLP is the Travel agent handling the trip and will provide all logistic services such as accommodation, transportation and domestic air tickets during their stay in Pakistan.\nAll arrangements have been made for their smooth travel within Pakistan.`,
    body_close: "It is requested to issue necessary Tourist VISA for their smooth arrival in Pakistan. We shall be very much appreciative of your support.",
    travelers: (row.travelers as Traveler[]) ?? [],
    signer_name: "Kashif Manzoor",
    signer_title: "Co-Founder Traverse Pakistan",
    issued_date: formatDate(new Date().toISOString().slice(0, 10)),
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-GB", { month: "long" });
  const year = d.getFullYear();
  return `${day}${daySuffix(d.getDate())}, ${month}, ${year}`;
}

function daySuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}
