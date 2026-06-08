import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
});

// PATCH /api/account/profile
// Body: { name }
// Updates the current user's display name in auth.users.user_metadata.
// Requires an authenticated session.
export async function PATCH(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const currentMeta = (user.user_metadata as Record<string, unknown> | undefined) ?? {};
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...currentMeta, name: parsed.data.name },
  });
  if (error) {
    console.error("[account/profile] update failed:", error.message);
    return NextResponse.json({ error: "Could not update name" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name: parsed.data.name });
}
