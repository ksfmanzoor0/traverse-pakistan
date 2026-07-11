import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { NewPackageForm } from "@/components/admin/NewPackageForm";
import { createPackage } from "../actions";

export const dynamic = "force-dynamic";

type Option = { slug: string; name: string };

async function fetchOptions(): Promise<{ destinations: Option[]; regions: Option[] }> {
  const supabase = getSupabaseAdmin();
  const [dest, reg] = await Promise.all([
    supabase.from("destinations").select("slug, name").order("name"),
    supabase.from("regions").select("slug, name").order("name"),
  ]);
  return { destinations: (dest.data as Option[]) ?? [], regions: (reg.data as Option[]) ?? [] };
}

export default async function AdminPackageNewPage() {
  const { destinations, regions } = await fetchOptions();
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/admin/packages" className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          ← All packages
        </Link>
        <h1 className="mt-2 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          New package
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          Create a stub with just the required fields. You&apos;ll land in the full editor after save. Package is
          created as <strong>Draft</strong>.
        </p>
      </div>
      <NewPackageForm destinations={destinations} regions={regions} createAction={createPackage} />
    </div>
  );
}
