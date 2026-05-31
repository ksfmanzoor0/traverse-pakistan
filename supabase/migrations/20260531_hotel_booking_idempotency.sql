-- Idempotency for hotel_bookings.
-- Same pattern: client passes per-attempt UUID, server short-circuits to
-- existing row if seen.

alter table public.hotel_bookings
  add column if not exists submit_uuid uuid;

create unique index if not exists hotel_bookings_submit_uuid_key
  on public.hotel_bookings (submit_uuid)
  where submit_uuid is not null;

-- Drop every existing create_hotel_booking overload to avoid
-- "could not choose best candidate" errors.
do $$
declare r record;
begin
  for r in select oid::regprocedure as sig from pg_proc where proname = 'create_hotel_booking' loop
    execute 'drop function ' || r.sig;
  end loop;
end $$;

create function public.create_hotel_booking(
  p_hotel_slug      text,
  p_checkin_date    date,
  p_checkout_date   date,
  p_adults          int,
  p_children        int,
  p_nights          int,
  p_total_amount    numeric,
  p_contact_name    text,
  p_contact_email   text,
  p_contact_phone   text,
  p_arrival_time    text,
  p_notes           text,
  p_line_items      jsonb,
  p_submit_uuid     uuid default null
)
returns table (booking_id uuid, booking_ref text, total_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref  text;
  v_id   uuid;
  v_amt  numeric;
  v_item jsonb;
begin
  -- Dedup short-circuit.
  if p_submit_uuid is not null then
    select hb.id, hb.booking_ref, hb.total_amount
      into v_id, v_ref, v_amt
      from public.hotel_bookings hb
      where hb.submit_uuid = p_submit_uuid
      limit 1;
    if found then
      return query select v_id, v_ref, v_amt;
      return;
    end if;
  end if;

  v_ref := 'HTL-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.hotel_bookings (
    booking_ref, hotel_slug, checkin_date, checkout_date,
    adults, children, nights, total_amount, currency,
    contact_name, contact_email, contact_phone,
    arrival_time, notes, submit_uuid
  ) values (
    v_ref, p_hotel_slug, p_checkin_date, p_checkout_date,
    p_adults, p_children, p_nights, p_total_amount, 'PKR',
    p_contact_name, p_contact_email, p_contact_phone,
    p_arrival_time, p_notes, p_submit_uuid
  )
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_line_items) loop
    insert into public.hotel_booking_rooms (
      booking_id, room_name, qty, adults, children, price_per_night
    ) values (
      v_id, v_item->>'roomName',
      (v_item->>'qty')::integer,
      (v_item->>'adults')::integer,
      (v_item->>'children')::integer,
      (v_item->>'pricePerNight')::integer
    );
  end loop;

  return query select v_id, v_ref, p_total_amount;
end;
$$;
