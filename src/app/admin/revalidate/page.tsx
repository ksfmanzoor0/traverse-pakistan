import { getAllHotels } from "@/services/hotel.service";
import { getAllTours } from "@/services/tour.service";
import { getAllPackages } from "@/services/package.service";
import { getAllDestinations } from "@/services/destination.service";
import { RevalidatePanel } from "@/components/admin/RevalidatePanel";

export const dynamic = "force-dynamic";

export default async function AdminRevalidatePage() {
  const [hotels, tours, packages, destinations] = await Promise.all([
    getAllHotels(),
    getAllTours(),
    getAllPackages(),
    getAllDestinations(),
  ]);

  const sections = [
    {
      title: "Hotels",
      endpoint: "/api/revalidate-hotels",
      listingPath: "/hotels",
      pathPrefix: "/hotels/",
      items: hotels.map((h) => ({ slug: h.slug, name: h.name })),
    },
    {
      title: "Tours",
      endpoint: "/api/revalidate-tours",
      listingPath: "/grouptours",
      pathPrefix: "/grouptours/",
      items: tours.map((t) => ({ slug: t.slug, name: t.name })),
    },
    {
      title: "Packages",
      endpoint: "/api/revalidate-packages",
      listingPath: "/packages",
      pathPrefix: "/packages/",
      items: packages.map((p) => ({ slug: p.slug, name: p.name })),
    },
    {
      title: "Destinations",
      endpoint: "/api/revalidate-destinations",
      listingPath: "/destinations",
      pathPrefix: "/destinations/",
      items: destinations.map((d) => ({ slug: d.slug, name: d.name })),
    },
  ];

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Cache Revalidation
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Pages are cached (ISR, 1h). After editing Supabase data or uploading
          images to R2, refresh the affected page here.
        </p>
      </div>

      <div className="grid gap-4">
        {sections.map((s) => (
          <RevalidatePanel key={s.title} {...s} />
        ))}
      </div>
    </div>
  );
}
