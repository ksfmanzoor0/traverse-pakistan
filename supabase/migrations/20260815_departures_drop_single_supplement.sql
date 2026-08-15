-- Drop the deprecated `single_supplement` column now that all readers derive
-- surcharges from twin_price + single_price. Backfill of the new columns is
-- verified in prod; the sidebar / wizard / pricing math no longer reference
-- single_supplement anywhere.

alter table public.departures drop column if exists single_supplement;
