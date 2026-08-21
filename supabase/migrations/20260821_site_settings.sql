-- Generic key/value settings table for admin-editable site content.
-- First use: 'terms' key stores the T&C page content (code of conduct list,
-- cancellation tiers, refund policy). Add more keys later as needed.

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_settings IS
  'Admin-editable, publicly-readable JSON blobs keyed by name. Currently: terms.';

CREATE OR REPLACE FUNCTION public.tg_site_settings_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS site_settings_touch_updated_at ON public.site_settings;
CREATE TRIGGER site_settings_touch_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_site_settings_touch_updated_at();

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed the 'terms' row with the current /terms page content.
INSERT INTO public.site_settings (key, value)
VALUES (
  'terms',
  jsonb_build_object(
    'intro',
    'Traverse Pakistan strictly follows these terms and conditions. You are required to read all of them before signing up for a trip with us. Participants receive an undertaking form at the start of each trip containing trip details and these T&Cs, requiring a physical signature and thumb impression.',
    'codeOfConduct',
    jsonb_build_array(
      'Garbage disposal must not pollute water sources or the natural environment.',
      'The host reserves the right to cancel the trip without prior notice for any reasons deemed appropriate by them.',
      'The company, trip leader, and organizers hold no responsibility for accidents arising from avalanches or unforeseen natural disasters.',
      'No liability is accepted for theft, loss, or damage to personal belongings.',
      'Weather, political conditions, and transport availability may necessitate itinerary changes; trip leaders decide on alternatives.',
      'Organizers can terminate a participant''s trip for indiscipline without refund.',
      'Management decides on meals; prices may adjust if fuel costs increase by more than PKR 30/litre from the announcement date.'
    ),
    'cancellation',
    jsonb_build_object(
      'group',
      jsonb_build_array(
        jsonb_build_object('days', '14 days before', 'charge', '50% charges'),
        jsonb_build_object('days', '7 days before', 'charge', '75% charges'),
        jsonb_build_object('days', '3 days before', 'charge', '100% charges'),
        jsonb_build_object('days', '1 day before', 'charge', '100% charges')
      ),
      'private',
      jsonb_build_array(
        jsonb_build_object('days', '30 days before', 'charge', '75% charges'),
        jsonb_build_object('days', '7 days before', 'charge', '100% charges'),
        jsonb_build_object('days', '3 days before', 'charge', '100% charges')
      ),
      'transport',
      jsonb_build_array(
        jsonb_build_object('days', '14 days before', 'charge', '30% charges'),
        jsonb_build_object('days', '7 days before', 'charge', '50% charges'),
        jsonb_build_object('days', '3 days before', 'charge', '75% charges'),
        jsonb_build_object('days', '1 day before', 'charge', '100% charges')
      ),
      'hotelsAirlinesNote',
      'Cancellation policies vary per hotel or airline and will be clearly shown before booking confirmation.'
    ),
    'flightCancellation',
    'In the event of a flight cancellation or road closure, clients may reschedule within 6 months or cancel. A minimum cancellation charge of 50% applies in either case.',
    'refund',
    'Approved refunds are processed within 6 working weeks from the date of cancellation.'
  )
) ON CONFLICT (key) DO NOTHING;
