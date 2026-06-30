import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAllTours } from "@/services/tour.service";
import { getAllPackages } from "@/services/package.service";
import { getAllHotels } from "@/services/hotel.service";
import { WishlistList } from "@/components/account/WishlistList";

interface WishlistRow {
  item_type: "tour" | "package" | "hotel";
  item_slug: string;
  created_at: string;
}

export interface ResolvedWishlistItem {
  type: "tour" | "package" | "hotel";
  slug: string;
  title: string;
  href: string;
  image: string | null;
  subtitle: string | null;
}

export default async function WishlistPage() {
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;
  if (!user) redirect("/auth/sign-in?next=/account/wishlist");

  // `wishlists` isn't in the generated Database types yet — local `any` cast
  // on the query builder. Regenerate types to drop this.
  const { data: rows } = await (supabase.from("wishlists" as never) as unknown as {
    select: (q: string) => {
      eq: (col: string, val: string) => {
        order: (col: string, opts: { ascending: boolean }) => Promise<{ data: WishlistRow[] | null }>;
      };
    };
  })
    .select("item_type, item_slug, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const wishlist = (rows ?? []) as WishlistRow[];

  if (wishlist.length === 0) {
    return (
      <div className="py-8 sm:py-12">
        <Container>
          <Breadcrumb items={[{ label: "Account", href: "/account" }, { label: "Wishlist" }]} />
          <EmptyState
            icon="heart"
            title="Your Wishlist is Empty"
            description="Save tours you love by tapping the heart icon on any card."
            action={
              <Link href="/grouptours">
                <Button size="lg">Explore Tours</Button>
              </Link>
            }
          />
        </Container>
      </div>
    );
  }

  // Resolve titles + images in parallel from existing services.
  const [tours, packages, hotels] = await Promise.all([
    wishlist.some((w) => w.item_type === "tour") ? getAllTours() : Promise.resolve([]),
    wishlist.some((w) => w.item_type === "package") ? getAllPackages() : Promise.resolve([]),
    wishlist.some((w) => w.item_type === "hotel") ? getAllHotels() : Promise.resolve([]),
  ]);

  const items: ResolvedWishlistItem[] = wishlist
    .map((w): ResolvedWishlistItem | null => {
      if (w.item_type === "tour") {
        const t = tours.find((x) => x.slug === w.item_slug);
        if (!t) return null;
        return {
          type: "tour",
          slug: t.slug,
          title: t.name,
          href: `/grouptours/${t.slug}`,
          image: t.images[0]?.url ?? null,
          subtitle: `${t.duration} days`,
        };
      }
      if (w.item_type === "package") {
        const p = packages.find((x) => x.slug === w.item_slug);
        if (!p) return null;
        return {
          type: "package",
          slug: p.slug,
          title: p.name,
          href: `/packages/${p.slug}`,
          image: p.images[0]?.url ?? null,
          subtitle: `${p.duration} days`,
        };
      }
      const h = hotels.find((x) => x.slug === w.item_slug);
      if (!h) return null;
      return {
        type: "hotel",
        slug: h.slug,
        title: h.name,
        href: `/hotels/${h.slug}`,
        image: h.images[0] ?? null,
        subtitle: h.location ?? null,
      };
    })
    .filter((x): x is ResolvedWishlistItem => x !== null);

  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Account", href: "/account" }, { label: "Wishlist" }]} />
        <div className="mt-6">
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">Your Wishlist</h1>
          <p className="mt-1.5 text-[14px] text-[var(--text-secondary)]">
            {items.length} saved {items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <WishlistList items={items} />
      </Container>
    </div>
  );
}
