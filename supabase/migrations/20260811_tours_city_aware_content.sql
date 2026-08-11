-- Make tour inclusions/exclusions city-aware and let itinerary days be filtered
-- by traveler home city. Each inclusion/exclusion item now carries an optional
-- cityOnly array; days can be skipped by city entirely.

ALTER TABLE public.tours ADD COLUMN inclusions_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tours ADD COLUMN exclusions_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.tours SET inclusions_jsonb =
  coalesce((SELECT jsonb_agg(jsonb_build_object('text', v)) FROM unnest(inclusions) v), '[]'::jsonb);
UPDATE public.tours SET exclusions_jsonb =
  coalesce((SELECT jsonb_agg(jsonb_build_object('text', v)) FROM unnest(exclusions) v), '[]'::jsonb);

ALTER TABLE public.tours DROP COLUMN inclusions;
ALTER TABLE public.tours DROP COLUMN exclusions;
ALTER TABLE public.tours RENAME COLUMN inclusions_jsonb TO inclusions;
ALTER TABLE public.tours RENAME COLUMN exclusions_jsonb TO exclusions;

ALTER TABLE public.tour_itinerary_days ADD COLUMN IF NOT EXISTS city_only text[];

COMMENT ON COLUMN public.tours.inclusions IS
  'Array of { text: string, cityOnly?: string[] }. cityOnly limits the item to specific home cities (ISB/LHE/KHI/KDU); absent = all cities.';
COMMENT ON COLUMN public.tours.exclusions IS
  'Same shape as inclusions.';
COMMENT ON COLUMN public.tour_itinerary_days.city_only IS
  'When set, day is only rendered for travelers whose home city is in this list. NULL = all cities (default).';
