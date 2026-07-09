import Link from "next/link";
import { createInvitationRequestAdmin } from "../actions";

export const dynamic = "force-dynamic";

export default function NewInvitationLetterPage() {
  const inputCls =
    "w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px]";
  const labelCls = "block text-[12px] font-semibold text-[var(--text-tertiary)] mb-1";

  return (
    <div className="p-6 sm:p-8 max-w-[720px] space-y-6">
      <div>
        <Link href="/admin/invitation-letters" className="text-[13px] text-[var(--text-tertiary)]">
          ← All invitation letters
        </Link>
        <h1 className="mt-2 text-[24px] font-bold text-[var(--text-primary)]">New invitation letter</h1>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Creates a paid, admin-owned request. Fill traveller details and letter body in the editor after creation.
          The letter will be delivered to the contact email you specify below when you hit "Send letter to traveler".
        </p>
      </div>

      <form action={createInvitationRequestAdmin} className="space-y-5">
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Contact</h2>
          <div>
            <label className={labelCls}>Contact name *</label>
            <input name="contact_name" required minLength={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email letter will be sent to *</label>
            <input name="contact_email" type="email" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input name="contact_phone" className={inputCls} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Embassy & trip</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Embassy country</label>
              <input name="embassy_country" placeholder="Spain" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Embassy city</label>
              <input name="embassy_city" placeholder="Madrid" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Arrival date</label>
              <input name="arrival_date" type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Departure date</label>
              <input name="departure_date" type="date" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Destinations (comma-separated)</label>
            <input name="destinations" placeholder="Islamabad, Skardu, Hunza" className={inputCls} />
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/invitation-letters" className="text-[13px] text-[var(--text-tertiary)]">
            Cancel
          </Link>
          <button
            type="submit"
            className="h-10 px-5 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white text-[13px] font-semibold"
          >
            Create request
          </button>
        </div>
      </form>
    </div>
  );
}
