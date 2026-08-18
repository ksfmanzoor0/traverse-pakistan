-- Blog posts: flat table with sections as jsonb.
-- Each section: { id, heading?, headingLevel?, text (HTML from TipTap),
-- images: [{ src, alt, caption? }] }.
-- Public read gated by published=true; admin writes bypass RLS via service role.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  image text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  categories text[] NOT NULL DEFAULT '{}',
  author text NOT NULL DEFAULT 'Traverse Pakistan',
  read_time text NOT NULL DEFAULT '',
  destination_slug text,
  meta_title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.blog_posts.sections IS
  'Ordered array of { id, heading?, headingLevel?, text (HTML from TipTap), images: [{src, alt, caption?}] }.';

COMMENT ON COLUMN public.blog_posts.destination_slug IS
  'Soft reference to destinations.slug (not a FK: allows blog posts about places that leave the taxonomy).';

CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx
  ON public.blog_posts (published_at DESC NULLS LAST)
  WHERE published = true;

CREATE INDEX IF NOT EXISTS blog_posts_destination_slug_idx
  ON public.blog_posts (destination_slug)
  WHERE destination_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_blog_posts_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS blog_posts_touch_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_touch_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_blog_posts_touch_updated_at();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_posts_public_read_published" ON public.blog_posts;
CREATE POLICY "blog_posts_public_read_published"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (published = true);
