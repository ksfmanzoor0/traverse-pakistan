-- Idempotency for package_bookings.
-- Client passes a UUID generated once per checkout attempt. If the
-- network drops the response and the user retries (manually or via
-- auto-retry), we return the existing row instead of inserting a duplicate.

alter table public.package_bookings
  add column if not exists submit_uuid uuid;

create unique index if not exists package_bookings_submit_uuid_key
  on public.package_bookings (submit_uuid)
  where submit_uuid is not null;

-- Replace the RPC. Same body as before, plus a dedup short-circuit on
-- p_submit_uuid at the top, and the column written into the insert.
create or replace function public.create_package_booking(
  p_package_slug   text,
  p_tier           text,
  p_departure_city text,
  p_start_date     date,
  p_adults         int,
  p_rooms          int,
  p_total_amount   numeric,
  p_contact_name   text,
  p_contact_email  text,
  p_contact_phone  text,
  p_notes          text,
  p_submit_uuid    uuid default null
)
returns table (booking_id uuid, booking_ref text, total_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text;
  v_id  uuid;
  v_amt numeric;
begin
  -- Dedup: if a row already exists with this submit_uuid, return it.
  if p_submit_uuid is not null then
    select pb.id, pb.booking_ref, pb.total_amount
      into v_id, v_ref, v_amt
      from public.package_bookings pb
      where pb.submit_uuid = p_submit_uuid
      limit 1;
    if found then
      return query select v_id, v_ref, v_amt;
      return;
    end if;
  end if;

  -- Generate unique ref: PKG-XXXXXXXX
  loop
    v_ref := 'PKG-' || upper(substring(md5(random()::text) from 1 for 8));
    exit when not exists (select 1 from package_bookings where package_bookings.booking_ref = v_ref);
  end loop;

  insert into package_bookings (
    booking_ref, package_slug, tier, departure_city, start_date,
    adults, rooms, total_amount, contact_name, contact_email, contact_phone, notes,
    submit_uuid
  ) values (
    v_ref, p_package_slug, p_tier, p_departure_city, p_start_date,
    p_adults, p_rooms, p_total_amount, p_contact_name, p_contact_email, p_contact_phone, p_notes,
    p_submit_uuid
  )
  returning id into v_id;

  return query select v_id, v_ref, p_total_amount;
end;
$$;
