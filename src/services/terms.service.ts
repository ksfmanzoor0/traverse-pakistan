import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { TermsContent } from "@/lib/supabase/types";

// Static fallback — matches the seeded row. Used only if Supabase read fails
// (not on empty). Update here + in the seed migration together.
export const TERMS_FALLBACK: TermsContent = {
  intro:
    "Traverse Pakistan strictly follows these terms and conditions. You are required to read all of them before signing up for a trip with us. Participants receive an undertaking form at the start of each trip containing trip details and these T&Cs, requiring a physical signature and thumb impression.",
  codeOfConduct: [
    "Garbage disposal must not pollute water sources or the natural environment.",
    "The host reserves the right to cancel the trip without prior notice for any reasons deemed appropriate by them.",
    "The company, trip leader, and organizers hold no responsibility for accidents arising from avalanches or unforeseen natural disasters.",
    "No liability is accepted for theft, loss, or damage to personal belongings.",
    "Weather, political conditions, and transport availability may necessitate itinerary changes; trip leaders decide on alternatives.",
    "Organizers can terminate a participant's trip for indiscipline without refund.",
    "Management decides on meals; prices may adjust if fuel costs increase by more than PKR 30/litre from the announcement date.",
  ],
  cancellation: {
    group: [
      { days: "14 days before", charge: "50% charges" },
      { days: "7 days before", charge: "75% charges" },
      { days: "3 days before", charge: "100% charges" },
      { days: "1 day before", charge: "100% charges" },
    ],
    private: [
      { days: "30 days before", charge: "75% charges" },
      { days: "7 days before", charge: "100% charges" },
      { days: "3 days before", charge: "100% charges" },
    ],
    transport: [
      { days: "14 days before", charge: "30% charges" },
      { days: "7 days before", charge: "50% charges" },
      { days: "3 days before", charge: "75% charges" },
      { days: "1 day before", charge: "100% charges" },
    ],
    hotelsAirlinesNote:
      "Cancellation policies vary per hotel or airline and will be clearly shown before booking confirmation.",
  },
  flightCancellation:
    "In the event of a flight cancellation or road closure, clients may reschedule within 6 months or cancel. A minimum cancellation charge of 50% applies in either case.",
  refund:
    "Approved refunds are processed within 6 working weeks from the date of cancellation.",
};

const _fetchTerms = unstable_cache(
  async (): Promise<TermsContent> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "terms")
      .maybeSingle();
    if (error) throw new Error(`getTerms: ${error.message}`);
    return (data?.value as TermsContent) ?? TERMS_FALLBACK;
  },
  ["site-terms"],
  { tags: ["terms"], revalidate: 3600 },
);

export const getTerms = cache(async (): Promise<TermsContent> => {
  try {
    return await _fetchTerms();
  } catch (err) {
    console.error("[terms.service] Supabase read failed, using fallback:", err);
    return TERMS_FALLBACK;
  }
});
