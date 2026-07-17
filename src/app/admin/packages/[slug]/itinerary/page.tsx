import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ItineraryEditor } from "@/components/admin/ItineraryEditor";
import { saveItinerary } from "../../actions";

export const dynamic = "force-dynamic";

type DayRow = {
  day_number: number;
  title: string | null;
  description: string | null;
  hotel_deluxe: string | null;
  hotel_luxury: string | null;
  stops: Array<{ name: string; detail: string }> | null;
  driving_time: string | null;
  overnight: string | null;
  city_only: string[] | null;
};

type PackageRow = { slug: string; name: string; duration: number };
type HotelOption = { slug: string; name: string; tier: string | null };

async function fetchPackage(slug: string): Promise<PackageRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("packages")
    .select("slug, name, duration")
    .eq("slug", slug)
    .maybeSingle();
  return (data as PackageRow | null) ?? null;
}

async function fetchDays(slug: string): Promise<DayRow[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("package_itinerary_days")
    .select("day_number, title, description, hotel_deluxe, hotel_luxury, stops, driving_time, overnight, city_only")
    .eq("package_slug", slug)
    .order("day_number");
  return (data as DayRow[]) ?? [];
}

async function fetchHotels(): Promise<HotelOption[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("hotels").select("slug, name, tier").order("name");
  return (data as HotelOption[]) ?? [];
}

export default async function AdminPackageItineraryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [pkg, days, hotels] = await Promise.all([fetchPackage(slug), fetchDays(slug), fetchHotels()]);
  if (!pkg) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link href={`/admin/packages/${slug}`} className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          ← Back to package
        </Link>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Itinerary — {pkg.name}
          </h1>
          <span className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            {pkg.duration} days
          </span>
        </div>
      </div>

      <ItineraryEditor
        packageSlug={slug}
        expectedDays={pkg.duration}
        initialDays={days}
        hotels={hotels}
        saveAction={saveItinerary}
      />
    </div>
  );
}
