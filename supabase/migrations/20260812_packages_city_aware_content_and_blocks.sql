-- Make packages inclusions/exclusions city-aware (same shape tours got) and
-- add body_blocks for the rich block editor. Existing string values are
-- wrapped as { text: "..." }.

ALTER TABLE public.packages ADD COLUMN inclusions_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.packages ADD COLUMN exclusions_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.packages SET inclusions_jsonb =
  coalesce((SELECT jsonb_agg(jsonb_build_object('text', v)) FROM unnest(inclusions) v), '[]'::jsonb);
UPDATE public.packages SET exclusions_jsonb =
  coalesce((SELECT jsonb_agg(jsonb_build_object('text', v)) FROM unnest(exclusions) v), '[]'::jsonb);

ALTER TABLE public.packages DROP COLUMN inclusions;
ALTER TABLE public.packages DROP COLUMN exclusions;
ALTER TABLE public.packages RENAME COLUMN inclusions_jsonb TO inclusions;
ALTER TABLE public.packages RENAME COLUMN exclusions_jsonb TO exclusions;

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS body_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.packages.inclusions IS
  'Array of { text: string, cityOnly?: string[] }. cityOnly limits the item to specific starting cities; absent = all.';
COMMENT ON COLUMN public.packages.exclusions IS
  'Same shape as inclusions.';
COMMENT ON COLUMN public.packages.body_blocks IS
  'Ordered block editor content for the package body. Each block: { id, type, cityOnly?: string[], ...typeSpecificFields }.';
