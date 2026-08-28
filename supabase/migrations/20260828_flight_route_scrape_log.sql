-- One row per (route, depart_date, scrape_run) the aeroglobe scraper visits.
-- Purpose: distinguish "we scraped this month/route and it came back empty"
-- from "we've never looked." Populated by:
--   normal-mode workflow  → every 12h, near-term horizons
--   extended-mode workflow → monthly, 90/120/150/180 day-out horizons
--
-- Consumer queries (future) — detect seasonal carrier suspensions:
--   SELECT origin, destination, EXTRACT(MONTH FROM depart_date) AS month,
--          carrier,
--          COUNT(*) FILTER (WHERE carrier = ANY(carriers_seen)) AS present,
--          COUNT(*)                                             AS visits
--   FROM flight_route_scrape_log, UNNEST(ARRAY['PIA','AirBlue','AirSial','Flyjinnah']) carrier
--   WHERE mode = 'extended' AND scraped_at > NOW() - INTERVAL '90 days'
--   GROUP BY 1,2,3,4 HAVING COUNT(*) >= 2 AND SUM(CASE WHEN carrier = ANY(carriers_seen) THEN 1 ELSE 0 END) = 0;
--   -- carriers that were visited ≥2 times in a month with zero appearances → suspended
--
-- Empty carriers_seen is meaningful (e.g. Nov LHE→KDU: scraper visited, no
-- carrier returned fares — winter closure). Do NOT filter these out on write.

CREATE TABLE IF NOT EXISTS public.flight_route_scrape_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin         text NOT NULL,
  destination    text NOT NULL,
  route_type     text NOT NULL CHECK (route_type IN ('ONEWAY', 'RETURN')),
  depart_date    date NOT NULL,
  return_date    date,
  carriers_seen  text[] NOT NULL DEFAULT '{}',
  fare_count     integer NOT NULL DEFAULT 0,
  mode           text NOT NULL CHECK (mode IN ('normal', 'extended')),
  scraped_at     timestamptz NOT NULL DEFAULT NOW()
);

-- Fast lookup: "what did we see for this route in this month across all scrapes?"
CREATE INDEX IF NOT EXISTS flight_route_scrape_log_route_month_idx
  ON public.flight_route_scrape_log (origin, destination, route_type, depart_date DESC);

-- Fast lookup: "what has the extended-mode scraper found lately?"
CREATE INDEX IF NOT EXISTS flight_route_scrape_log_mode_scraped_at_idx
  ON public.flight_route_scrape_log (mode, scraped_at DESC);

-- No RLS — service-role writer (scraper) and admin readers only.
ALTER TABLE public.flight_route_scrape_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role writes scrape log"
  ON public.flight_route_scrape_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
