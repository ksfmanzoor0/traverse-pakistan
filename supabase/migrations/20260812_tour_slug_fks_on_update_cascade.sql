-- Let a tour's slug be renamed and have child tables track it. Existing
-- ON DELETE CASCADE preserved; only ON UPDATE behavior is new. Departures
-- and reviews don't have FKs so the rename action updates them manually
-- before touching tours.slug.

ALTER TABLE public.tour_itinerary_days
  DROP CONSTRAINT tour_itinerary_days_tour_slug_fkey,
  ADD CONSTRAINT tour_itinerary_days_tour_slug_fkey
    FOREIGN KEY (tour_slug) REFERENCES public.tours(slug)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.tour_addons
  DROP CONSTRAINT tour_addons_tour_slug_fkey,
  ADD CONSTRAINT tour_addons_tour_slug_fkey
    FOREIGN KEY (tour_slug) REFERENCES public.tours(slug)
    ON DELETE CASCADE ON UPDATE CASCADE;
