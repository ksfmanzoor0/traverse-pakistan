"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWishlist } from "@/components/auth/WishlistProvider";
import { Icon } from "@/components/ui/Icon";
import type { ResolvedWishlistItem } from "@/app/account/wishlist/page";

export function WishlistList({ items }: { items: ResolvedWishlistItem[] }) {
  const router = useRouter();
  const { toggle } = useWishlist();
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(item: ResolvedWishlistItem) {
    const key = `${item.type}:${item.slug}`;
    setRemoving(key);
    try {
      await toggle(item.type, item.slug);
      router.refresh();
    } catch {
      /* silent */
    } finally {
      setRemoving(null);
    }
  }

  return (
    <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {items.map((item) => {
        const key = `${item.type}:${item.slug}`;
        const isRemoving = removing === key;
        return (
          <li
            key={key}
            className="group relative bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] overflow-hidden transition-shadow"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <Link href={item.href} className="block">
              <div className="relative aspect-[16/10] bg-[var(--bg-subtle)]">
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-primary)]/95 text-[var(--text-secondary)]">
                  {item.type}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight line-clamp-1">{item.title}</h3>
                {item.subtitle && (
                  <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{item.subtitle}</p>
                )}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => handleRemove(item)}
              disabled={isRemoving}
              aria-label="Remove from wishlist"
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-primary)]/95 text-[var(--error)] hover:bg-[var(--bg-primary)] transition-colors disabled:opacity-70 cursor-pointer"
            >
              <Icon name="x" size="xs" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
