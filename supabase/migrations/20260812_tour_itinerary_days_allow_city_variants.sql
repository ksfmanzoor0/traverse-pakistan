-- Drop the (tour_slug, day_number) uniqueness so admins can define multiple
-- variants of the same day scoped by city_only (e.g. Day 0 for LHE and a
-- different Day 0 for KHI). The renderer filters by cityOnly then renumbers
-- 1..N contiguously, so overlapping day_number values are safe.

ALTER TABLE public.tour_itinerary_days
  DROP CONSTRAINT IF EXISTS tour_itinerary_days_tour_slug_day_number_key;
