-- Add bed_tax_rate column to hotels (separate from GST).
-- Real-world Pakistan hotel tax = bed/occupancy tax + GST (general sales tax).
-- Both rates applied by app at render/checkout, never baked into hotel_rooms.price.
-- Example KP region: bed_tax_rate=0.07, tax_rate=0.06 (online card).

alter table hotels add column if not exists bed_tax_rate numeric not null default 0;
comment on column hotels.bed_tax_rate is 'Bed/occupancy tax rate as decimal (e.g. 0.07 for 7%). Separate from hotels.tax_rate which represents GST. Applied at render/checkout — never baked into hotel_rooms.price.';
comment on column hotels.tax_rate is 'GST (general sales tax) rate as decimal (e.g. 0.16 for 16%). Applied at render/checkout — never baked into hotel_rooms.price. See also hotels.bed_tax_rate.';
