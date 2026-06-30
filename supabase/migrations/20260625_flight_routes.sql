-- Flight fares scraped from Aeroglobe (and overridden via /admin/flight-fares).
-- Consumed by the package pricing engine and the booking quote flow.

create table if not exists flight_routes (
  id              uuid primary key default gen_random_uuid(),
  origin          text not null,
  destination     text not null,
  airline         text not null,
  flight_numbers  text[],
  route_type      text not null check (route_type in ('ONEWAY','RETURN')),
  depart_date     date not null,
  return_date     date,
  fare_total      integer not null,
  base_fare       integer,
  tax             integer,
  rbd             text,
  is_refundable   boolean,
  currency        text not null default 'PKR',
  source          text not null,   -- 'aeroglobe' | 'manual'
  source_url      text,
  notes           text,            -- admin notes for manual overrides
  scraped_at      timestamptz not null default now(),
  unique (origin, destination, airline, route_type, depart_date, return_date, source)
);

create index if not exists flight_routes_lookup_idx
  on flight_routes (origin, destination, route_type, depart_date);

create index if not exists flight_routes_scraped_at_idx
  on flight_routes (scraped_at desc);

-- Service-role only. The /admin pages use the service-role key server-side.
alter table flight_routes enable row level security;

-- Aeroglobe credentials + kill switch for the GitHub Actions scraper.
-- The scraper looks up this row first; falls back to env if missing.

create table if not exists flight_scraper_config (
  id                  text primary key default 'default',
  aeroglobe_email     text,
  aeroglobe_password  text,
  scrape_enabled      boolean default true,
  updated_at          timestamptz default now(),
  updated_by          text
);

insert into flight_scraper_config (id) values ('default')
  on conflict (id) do nothing;

alter table flight_scraper_config enable row level security;
