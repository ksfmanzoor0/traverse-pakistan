-- Block-editor content for the tour body. Renders below the description on
-- the tour page and is city-aware (each block can carry cityOnly to hide
-- itself when the traveler's home isn't in the list).

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS body_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tours.body_blocks IS
  'Ordered block editor content for the tour body. Each block: { id, type, cityOnly?: string[], ...typeSpecificFields }. Types: heading, paragraph, list, image, callout, embed, divider. Empty array renders nothing.';
