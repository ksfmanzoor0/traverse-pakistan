import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

function safeNext(next: string | null): string {
  if (!next) return "/mybookings";
  if (!next.startsWith("/") || next.startsWith("//")) return "/mybookings";
  return next;
}

async function flipVerifiedFlag(userId: string, currentMetadata: Record<string, unknown> | undefined) {
  if (currentMetadata?.verified_via_otp === true) return;
  try {
    const admin = getSupabaseAdmin();
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { ...(currentMetadata ?? {}), verified_via_otp: true },
    });
  } catch (err) {
    console.error("[auth/callback] failed to flip verified_via_otp:", err);
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const errorDescription = url.searchParams.get("error_description");
  const next = safeNext(url.searchParams.get("next"));

  if (errorDescription) {
    const redirect = new URL("/auth/sign-in", url.origin);
    redirect.searchParams.set("error", errorDescription);
    return NextResponse.redirect(redirect);
  }

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/auth/sign-in", url.origin));
  }

  const supabase = await getSupabaseServer();

  // Magic-link / email-confirmation flow (token_hash + type).
  if (tokenHash) {
    const verifyType = (type ?? "magiclink") as
      | "magiclink"
      | "email"
      | "recovery"
      | "invite"
      | "signup"
      | "email_change";
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: verifyType });
    if (error || !data?.user) {
      const redirect = new URL("/bookings/find", url.origin);
      redirect.searchParams.set("error", error?.message ?? "Invalid or expired link");
      return NextResponse.redirect(redirect);
    }
    await flipVerifiedFlag(data.user.id, data.user.user_metadata as Record<string, unknown> | undefined);
    return NextResponse.redirect(new URL(next, url.origin));
  }

  // OAuth PKCE flow (code).
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const redirect = new URL("/auth/sign-in", url.origin);
      redirect.searchParams.set("error", error.message);
      return NextResponse.redirect(redirect);
    }
    if (data?.user) {
      await flipVerifiedFlag(data.user.id, data.user.user_metadata as Record<string, unknown> | undefined);
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }

  return NextResponse.redirect(new URL("/auth/sign-in", url.origin));
}
