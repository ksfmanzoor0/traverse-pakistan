import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { repriceAllPackages } from "@/services/package-quote.service";

/**
 * Daily cron that re-snapshots every package's engine price into
 * `packages.pricing` and busts both relevant cache tags. The actual reprice
 * logic lives in `package-quote.service.ts` so admin save actions that mutate
 * engine inputs (vehicle config, engine_config) can call the same code path
 * and keep listings + sidebar in sync without waiting for the scheduled run.
 *
 * Auth: Bearer token in Authorization header must equal CRON_SECRET. Vercel
 * Cron signs requests with this env var; manual triggers use the same secret.
 */
async function authorize(req: Request): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const denial = await authorize(req);
  if (denial) return denial;
  try {
    const summary = await repriceAllPackages();
    revalidateTag("packages", {});
    revalidateTag("package-quote", {});
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// GET so a one-liner curl + Vercel's GET-based cron trigger both work.
export async function GET(req: Request) {
  return POST(req);
}
