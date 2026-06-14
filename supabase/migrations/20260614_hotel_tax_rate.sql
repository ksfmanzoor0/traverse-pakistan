-- Add tax_rate column to hotels.
-- Sales/bed tax applied by app at render/checkout — NOT baked into hotel_rooms.price.
-- Example: 0.16 for 16% (Malam Jabba, Kalam). Default 0 for tax-free regions.

alter table hotels add column if not exists tax_rate numeric not null default 0;
comment on column hotels.tax_rate is 'Sales/bed tax rate as decimal (e.g. 0.16 for 16%). Applied by app at render/checkout — NOT baked into hotel_rooms.price.';
