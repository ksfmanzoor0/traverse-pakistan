import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { putR2Object, deleteR2Object, r2KeyFromUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function extForType(t: string): string {
  if (t === "image/jpeg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/avif") return "avif";
  return "jpg";
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await ctx.params;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported type ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB limit` }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = `tours/${slug}/${crypto.randomUUID()}.${extForType(file.type)}`;
  const r = await putR2Object(key, bytes, file.type);
  if (!r.ok || !r.url) {
    return NextResponse.json({ error: r.error ?? "upload failed" }, { status: 500 });
  }
  return NextResponse.json({ url: r.url });
}

export async function DELETE(req: NextRequest, _ctx: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url query param required" }, { status: 400 });
  const key = r2KeyFromUrl(url);
  if (!key) return NextResponse.json({ ok: true, skipped: true }); // external URL, nothing to delete
  const r = await deleteR2Object(key);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
