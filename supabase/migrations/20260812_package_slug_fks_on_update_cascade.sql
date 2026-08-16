-- Let a package's slug be renamed and have child tables follow.

ALTER TABLE public.package_itinerary_days
  DROP CONSTRAINT package_itinerary_days_package_slug_fkey,
  ADD CONSTRAINT package_itinerary_days_package_slug_fkey
    FOREIGN KEY (package_slug) REFERENCES public.packages(slug)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.package_addons
  DROP CONSTRAINT package_addons_package_slug_fkey,
  ADD CONSTRAINT package_addons_package_slug_fkey
    FOREIGN KEY (package_slug) REFERENCES public.packages(slug)
    ON DELETE CASCADE ON UPDATE CASCADE;
