import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST() {
  revalidateTag("destinations", {});
  return NextResponse.json({ revalidated: true });
}
