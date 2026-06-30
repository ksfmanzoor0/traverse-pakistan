import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { assertAdminOrSecret } from "@/lib/admin/api-guard";

export async function POST(req: NextRequest) {
  const denied = await assertAdminOrSecret(req);
  if (denied) return denied;

  const path = req.nextUrl.searchParams.get("path");
  revalidateTag("tours", {});
  if (path) revalidatePath(path);

  return NextResponse.json({ revalidated: true, tag: "tours", path });
}
