import Link from "next/link";
import { createInvitationRequestAdmin } from "../actions";
import { NewInvitationRequestForm } from "@/components/admin/NewInvitationRequestForm";

export const dynamic = "force-dynamic";

export default function NewInvitationLetterPage() {
  return (
    <div className="p-6 sm:p-8 max-w-[720px] space-y-6">
      <div>
        <Link href="/admin/invitation-letters" className="text-[13px] text-[var(--text-tertiary)]">
          ← All invitation letters
        </Link>
        <h1 className="mt-2 text-[24px] font-bold text-[var(--text-primary)]">New invitation letter</h1>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Creates a paid, admin-owned request. Fill traveller details and letter body in the editor after creation.
          The letter will be delivered to the contact email you specify below when you hit &quot;Send letter to traveler&quot;.
        </p>
      </div>

      <NewInvitationRequestForm createAction={createInvitationRequestAdmin} />
    </div>
  );
}
