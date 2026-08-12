-- Per-tour overrides for the child discount % and group-discount tiers that
-- were previously hard-coded in src/components/booking/pricing.ts.
-- NULL preserves current global defaults (50% child, 5% @ 3 adults, 10% @ 6 adults).

alter table public.tours
  add column if not exists child_discount_pct numeric,
  add column if not exists group_discount_tiers jsonb;

comment on column public.tours.child_discount_pct is
  'Fraction off base price for children (2–12). NULL = fall back to default 0.5.';

comment on column public.tours.group_discount_tiers is
  'Array of { minAdults:int, pct:numeric } sorted ascending by minAdults; discount applied to adults subtotal only. NULL = default [{minAdults:3,pct:0.05},{minAdults:6,pct:0.10}].';
