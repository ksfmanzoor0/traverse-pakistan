import Link from "next/link";
import { NewTourForm } from "@/components/admin/NewTourForm";
import { createTourAndRedirect } from "../actions";

export const dynamic = "force-dynamic";

export default function NewTourPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/admin/tours" className="text-[12px] text-[var(--text-secondary)] hover:underline">
          ← Back to tours
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">New tour</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Fill in the essentials to seed the row. Edit copy, itinerary, and addons on the next screen.
        </p>
      </div>
      <NewTourForm createAction={createTourAndRedirect} />
    </div>
  );
}
