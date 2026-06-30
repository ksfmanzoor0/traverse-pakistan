import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// Allows either: admin session (preferred, used by /admin UI buttons) OR
// the legacy REVALIDATE_SECRET header (CLI / webhooks).
export async function assertAdminOrSecret(req: NextRequest): Promise<NextResponse | null> {
  const secret = req.headers.get("x-revalidate-secret");
  if (secret && secret === process.env.REVALIDATE_SECRET) return null;

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
