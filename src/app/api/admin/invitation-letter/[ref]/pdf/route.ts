import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateInvitationLetterPdf } from "@/lib/invitation/generatePdf";
import { defaultLetterData, type LetterData } from "@/lib/invitation/letterData";
import { getInvitationSignatures, SIGNATURE_SLOT_COUNT } from "@/lib/invitation/config";
import type { InvitationRequest } from "@/lib/invitation/types";

export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const url = new URL(req.url);
  const unsigned = url.searchParams.get("unsigned") === "1";

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invitation_requests" as never)
    .select("*")
    .eq("ref", ref)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = data as unknown as InvitationRequest & { signature_slot?: number | null };

  const letterData = (row.letter_data as LetterData | null) ?? defaultLetterData(row);

  // Slot picking: honor the letter's stored slot, fall back to slot 0. Any
  // slot with a missing dataUrl falls back to the first slot that has one so
  // an admin's cleanup on one row doesn't accidentally produce a blank sig on
  // another letter.
  let signatureDataUrl: string | null | undefined = undefined;
  if (!unsigned) {
    const slots = await getInvitationSignatures();
    const requested = typeof row.signature_slot === "number" && row.signature_slot >= 0 && row.signature_slot < SIGNATURE_SLOT_COUNT
      ? row.signature_slot
      : 0;
    const picked = slots[requested]?.dataUrl ?? slots.find((s) => s.dataUrl)?.dataUrl ?? null;
    // Passing `null` explicitly (rather than undefined) tells the generator
    // not to consult the legacy default — important once we're driving purely
    // from the new slots array.
    signatureDataUrl = picked;
  }

  const pdf = await generateInvitationLetterPdf(letterData, { signatureDataUrl, omitSignature: unsigned });

  const filenameSuffix = unsigned ? "-unsigned" : "";
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Invitation-Letter-${ref}${filenameSuffix}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
