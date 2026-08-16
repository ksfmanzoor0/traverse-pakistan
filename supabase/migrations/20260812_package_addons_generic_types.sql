-- Mirror the tour_addons migration: widen the type enum + add the two extra
-- flags so packages can carry hotel/meal/etc. addons with optional-default-on
-- semantics and duration deltas.

ALTER TABLE public.package_addons DROP CONSTRAINT package_addons_type_check;

ALTER TABLE public.package_addons ADD CONSTRAINT package_addons_type_check
  CHECK (type = ANY (ARRAY[
    'flight'::text, 'bus'::text, 'hotel'::text, 'meal'::text,
    'activity'::text, 'transfer'::text, 'insurance'::text, 'custom'::text
  ]));

ALTER TABLE public.package_addons
  ADD COLUMN IF NOT EXISTS default_selected boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duration_delta int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.package_addons.default_selected IS
  'Only meaningful when is_required=false. Whether the addon starts checked in the UI.';
COMMENT ON COLUMN public.package_addons.duration_delta IS
  'Days added to trip length when this addon is selected (e.g. pre-tour hotel = 1).';
