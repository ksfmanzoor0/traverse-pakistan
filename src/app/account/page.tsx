import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { AccountGreeting } from "@/components/account/AccountGreeting";
import { Icon, type IconName } from "@/components/ui/Icon";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your Traverse Pakistan account, trips, and wishlist.",
  robots: { index: false, follow: false },
};

const menuItems: Array<{ label: string; href: string; icon: IconName; description: string }> = [
  { label: "My Bookings", href: "/account/trips", icon: "list-checks", description: "View your tours, packages, and hotel bookings" },
  { label: "Wishlist", href: "/account/wishlist", icon: "heart", description: "Tours you've saved for later" },
  { label: "Settings", href: "/account/settings", icon: "gear", description: "Profile and preferences" },
];

export default function AccountPage() {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Account" }]} />
        <AccountGreeting />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-[800px]">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group p-6 bg-[var(--bg-subtle)] rounded-[var(--radius-md)] border border-[var(--border-default)] hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)] text-center"
            >
              <span
                aria-hidden="true"
                className="inline-flex w-12 h-12 rounded-full items-center justify-center bg-[var(--primary-light)] text-[var(--primary-deep)] ring-1 ring-[var(--primary)]/15 transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.06]"
              >
                <Icon name={item.icon} size="xl" weight="regular" />
              </span>
              <h3 className="text-[15px] font-bold text-[var(--text-primary)] mt-3">{item.label}</h3>
              <p className="text-[13px] text-[var(--text-tertiary)] mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
