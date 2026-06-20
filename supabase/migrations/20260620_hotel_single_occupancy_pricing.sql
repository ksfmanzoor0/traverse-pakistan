-- Single-occupancy pricing columns.
-- Display prices fall back to `price` when single rate is not seeded.

alter table hotel_rooms        add column if not exists single_price integer;
alter table hotel_rooms        add column if not exists single_operator_price integer;
alter table hotel_room_prices  add column if not exists single_price integer;
alter table hotel_room_prices  add column if not exists single_operator_price integer;

comment on column hotel_rooms.single_price                is 'Display price for single occupancy. Optional — falls back to price when null.';
comment on column hotel_rooms.single_operator_price       is 'Tour-operator/corporate rate for single occupancy.';
comment on column hotel_room_prices.single_price          is 'Per-season display price for single occupancy. Falls back to price when null.';
comment on column hotel_room_prices.single_operator_price is 'Per-season tour-operator rate for single occupancy.';
