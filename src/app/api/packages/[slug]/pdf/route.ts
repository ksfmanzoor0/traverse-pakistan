import { NextResponse } from "next/server";
import { getPackageBySlug, getPackageItinerary } from "@/services/package.service";
import { getAllHotels } from "@/services/hotel.service";
import { generatePackageItineraryPdf } from "@/lib/packages/generatePackageItineraryPdf";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [pkg, itinerary, hotels] = await Promise.all([
    getPackageBySlug(slug),
    getPackageItinerary(slug),
    getAllHotels(),
  ]);
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hotelsBySlug = new Map(hotels.map((h) => [h.slug, h]));
  const pdf = await generatePackageItineraryPdf({ pkg, itinerary, hotelsBySlug });

  const safeName = pkg.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-Itinerary.pdf"`,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
