import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { repriceAllPackages } from "@/services/package-quote.service";

/**
 * Admin-gated reprice trigger. Same code path the daily cron uses
 * (`repriceAllPackages` from `package-quote.service.ts`), wrapped behind
 * `requireAdmin` so an admin can refresh the engine snapshot without curl
 * gymnastics or waiting for the scheduled run.
 */
export async function POST() {
  await requireAdmin();
  try {
    const summary = await repriceAllPackages();
    revalidateTag("packages", {});
    revalidateTag("package-quote", {});
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
