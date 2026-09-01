import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { HomeEditorRow } from "@/components/admin/HomeFeaturedEditor";
import { HomeAdminTabs } from "./HomeAdminTabs";

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadTours(): Promise<HomeEditorRow[]> {
  const supabase = getSupabaseAdmin();
  const { data: tours, error } = await supabase
    .from("tours")
    .select("slug, name, duration, published, featured, featured_rank")
    .order("name");
  if (error) throw new Error(error.message);
  const slugs = (tours ?? []).map((t) => t.slug);
  const departureMap = new Map<string, string>();
  if (slugs.length > 0) {
    const { data: deps } = await supabase
      .from("departures")
      .select("tour_slug, departure_date")
      .in("tour_slug", slugs)
      .eq("status", "open")
      .gte("departure_date", todayISO())
      .order("departure_date", { ascending: true });
    for (const d of (deps ?? []) as { tour_slug: string; departure_date: string }[]) {
      if (!departureMap.has(d.tour_slug)) departureMap.set(d.tour_slug, d.departure_date);
    }
  }
  return (tours ?? []).map((t) => ({
    slug: t.slug,
    name: t.name,
    subtitle: `${t.duration} day${t.duration === 1 ? "" : "s"}`,
    published: !!t.published,
    featured: !!t.featured,
    rank: t.featured_rank ?? null,
    nextDeparture: departureMap.get(t.slug) ?? null,
  }));
}

async function loadPackages(): Promise<HomeEditorRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("packages")
    .select("slug, name, duration, published, featured, featured_rank")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    slug: p.slug,
    name: p.name,
    subtitle: `${p.duration} day${p.duration === 1 ? "" : "s"}`,
    published: !!p.published,
    featured: !!p.featured,
    rank: p.featured_rank ?? null,
    nextDeparture: null,
  }));
}

async function loadDestinations(): Promise<HomeEditorRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("destinations")
    .select("slug, name, parent_id, home_rank, hero_image, regions ( slug, name )")
    .is("parent_id", null)
    .order("name");
  if (error) throw new Error(error.message);
  type Row = { slug: string; name: string; home_rank: number | null; hero_image: string | null; regions: { name: string | null } | null };
  return ((data ?? []) as unknown as Row[]).map((d) => ({
    slug: d.slug,
    name: d.name,
    subtitle: d.regions?.name ?? null,
    published: !!d.hero_image,
    featured: d.home_rank !== null,
    rank: d.home_rank ?? null,
    nextDeparture: null,
  }));
}

export default async function AdminHomePage() {
  await requireAdmin();
  const [tours, packages, destinations] = await Promise.all([
    loadTours(),
    loadPackages(),
    loadDestinations(),
  ]);
  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[var(--text-primary)]">Home Page Ordering</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1">
          Control which tours, packages and destinations surface on the home page
          and in what order. Featured items with an explicit order number appear
          first, then remaining featured items by next departure date.
        </p>
      </div>
      <HomeAdminTabs tours={tours} packages={packages} destinations={destinations} />
    </div>
  );
}
