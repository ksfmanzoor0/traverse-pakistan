import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST() {
  revalidateTag("packages", {});
  return NextResponse.json({ revalidated: true });
}
