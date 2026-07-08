import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateInvitationLetterPdf } from "@/lib/invitation/generatePdf";
import { defaultLetterData, type LetterData } from "@/lib/invitation/letterData";
import type { InvitationRequest } from "@/lib/invitation/types";

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invitation_requests" as never)
    .select("*")
    .eq("ref", ref)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = data as unknown as InvitationRequest;

  const letterData = (row.letter_data as LetterData | null) ?? defaultLetterData(row);
  const pdf = await generateInvitationLetterPdf(letterData);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Invitation-Letter-${ref}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
