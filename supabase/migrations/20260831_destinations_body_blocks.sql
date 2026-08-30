-- Rich block-editor content on destinations — same infra as packages/tours
-- body_blocks. Renders on /destinations/[slug] between hero and children rail.
-- Editable via the admin destination editor.

ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS body_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;
