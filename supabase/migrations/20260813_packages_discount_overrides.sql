-- Per-package overrides for child + group discounts (parity with tours).
-- Currently editable in the admin UI but not wired into any customer-side
-- pricing calc — packages have their own tier/city engine and discounts will
-- be layered on when the pricing engine redesign lands. NULL = no override.

alter table public.packages
  add column if not exists child_discount_pct numeric,
  add column if not exists group_discount_tiers jsonb;

comment on column public.packages.child_discount_pct is
  'Fraction off base for children (2-12). NULL = no discount / not yet wired into pricing engine.';

comment on column public.packages.group_discount_tiers is
  'Array of { minAdults:int, pct:numeric } sorted ascending by minAdults. NULL = no tiers / not yet wired into pricing engine.';
