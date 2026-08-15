-- Split the single per-person `single_supplement` into two admin-editable
-- pre-multiplied surcharges so the pricing math has no × 2 / × 3 magic
-- constants and admin can set each independently:
--
--   twin_price   = surcharge PER twin private room  (2 friends alone)
--   single_price = surcharge PER solo person        (1 alone in a room)
--
-- Base per-person `price` (group/triple/quad share rate) stays as-is.
-- Backfill preserves the historical formula exactly:
--   twin_price   = single_supplement * 2
--   single_price = single_supplement * 3
--
-- `single_supplement` column is kept during this transition — dropped in a
-- follow-up once prod verifies the new columns render correctly everywhere.

alter table public.departures
  add column if not exists twin_price integer,
  add column if not exists single_price integer;

update public.departures
set twin_price   = coalesce(single_supplement, 0) * 2,
    single_price = coalesce(single_supplement, 0) * 3
where twin_price is null or single_price is null;

comment on column public.departures.twin_price is
  'Surcharge PER twin private room (2 friends alone). Base = single_supplement * 2.';
comment on column public.departures.single_price is
  'Surcharge PER solo person (1 alone in a room). Base = single_supplement * 3.';
