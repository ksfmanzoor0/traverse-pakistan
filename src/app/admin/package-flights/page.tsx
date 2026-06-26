import { requireAdmin } from "@/lib/admin/guard";
import { PackageFlightPreview } from "@/components/admin/flight-fares/PackageFlightPreview";

export const dynamic = "force-dynamic";

type SearchParams = {
  preview_date?: string;
};

export default async function PackageFlightsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Package Flights
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Per-traveler flight cost the pricing engine would charge for each flight-inclusive
          package, resolved from scraped fares + manual overrides.
        </p>
      </div>

      <PackageFlightPreview departureDate={params.preview_date} />
    </div>
  );
}
