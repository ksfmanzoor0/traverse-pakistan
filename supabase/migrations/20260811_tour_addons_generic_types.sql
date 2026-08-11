-- Widen tour_addons.type to cover hotel/meal/activity/transfer/insurance/custom
-- and add default_selected + duration_delta so optional addons can be pre-checked
-- and trip-length changes surface in the UI.

ALTER TABLE public.tour_addons DROP CONSTRAINT tour_addons_type_check;

ALTER TABLE public.tour_addons ADD CONSTRAINT tour_addons_type_check
  CHECK (type = ANY (ARRAY[
    'flight'::text, 'bus'::text, 'hotel'::text, 'meal'::text,
    'activity'::text, 'transfer'::text, 'insurance'::text, 'custom'::text
  ]));

ALTER TABLE public.tour_addons
  ADD COLUMN IF NOT EXISTS default_selected boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duration_delta int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tour_addons.default_selected IS
  'Only meaningful when is_required=false. Whether the addon starts checked in the UI.';
COMMENT ON COLUMN public.tour_addons.duration_delta IS
  'Days added to trip length when this addon is selected (e.g. pre-tour hotel = 1).';
