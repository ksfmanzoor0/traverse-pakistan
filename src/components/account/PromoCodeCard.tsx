import { getSupabaseServer } from "@/lib/supabase/server";
import { mintPromoCodeForUser } from "@/lib/promo/mint";
import { formatPrice } from "@/lib/utils";

// Server component — renders the user's personal Traverse-NN promo code on
// /account. Mints on first visit (idempotent). No-op when logged out.
export async function PromoCodeCard() {
  const supabase = await getSupabaseServer();
  const { data: sess } = await supabase.auth.getUser();
  const user = sess?.user;
  if (!user) return null;

  const promo = await mintPromoCodeForUser(user.id);
  if (!promo) return null;

  const used = promo.used_at != null;

  return (
    <div
      className="mb-10 p-6 rounded-[var(--radius-md)] border border-[var(--primary)]/30 bg-[var(--primary-light)]/60"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary-deep)] mb-2">
            Your Traverse promo code
          </p>
          <p className="text-[24px] font-bold font-mono text-[var(--text-primary)]">{promo.code}</p>
          {used ? (
            <p className="text-[13px] text-[var(--text-secondary)] mt-2">
              Used on booking <span className="font-mono">{promo.used_on_booking_ref}</span>.
            </p>
          ) : (
            <p className="text-[13px] text-[var(--text-secondary)] mt-2">
              Apply at package checkout for <span className="font-semibold text-[var(--text-primary)]">{formatPrice(promo.discount_amount)}</span> off your first booking. One-time use.
            </p>
          )}
        </div>
        {!used && (
          <div className="shrink-0 h-11 px-4 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-bold inline-flex items-center">
            {formatPrice(promo.discount_amount)} off
          </div>
        )}
      </div>
    </div>
  );
}
