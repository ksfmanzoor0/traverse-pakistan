import { getTerms } from "@/services/terms.service";
import { TermsEditor } from "@/components/admin/TermsEditor";

export const dynamic = "force-dynamic";

export default async function AdminTermsPage() {
  const terms = await getTerms();
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Terms &amp; Conditions
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Edit the /terms page content. Save invalidates the public page immediately.
        </p>
      </div>
      <TermsEditor initial={terms} />
    </div>
  );
}
