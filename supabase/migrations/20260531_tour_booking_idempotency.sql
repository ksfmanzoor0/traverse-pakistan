-- Idempotency for tour bookings (bookings table).
-- Drops all create_booking overloads (there's a stale one with
-- p_departure_city) and replaces with a single signature that takes
-- p_submit_uuid and short-circuits to existing row on retry.

alter table public.bookings
  add column if not exists submit_uuid uuid;

create unique index if not exists bookings_submit_uuid_key
  on public.bookings (submit_uuid)
  where submit_uuid is not null;

-- Drop every existing create_booking overload.
do $$
declare r record;
begin
  for r in select oid::regprocedure as sig from pg_proc where proname = 'create_booking' loop
    execute 'drop function ' || r.sig;
  end loop;
end $$;

create function public.create_booking(
  p_departure_id    uuid,
  p_seats           int,
  p_single_rooms    int,
  p_contact_name    text,
  p_contact_email   text,
  p_contact_phone   text,
  p_participants    jsonb,
  p_notes           text,
  p_submit_uuid     uuid default null
)
returns table (booking_id uuid, booking_ref text, total_amount int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dep    departures%rowtype;
  v_total  int;
  v_bid    uuid;
  v_ref    text;
  v_amt    int;
begin
  -- Dedup short-circuit.
  if p_submit_uuid is not null then
    select b.id, b.booking_ref, b.total_amount
      into v_bid, v_ref, v_amt
      from public.bookings b
      where b.submit_uuid = p_submit_uuid
      limit 1;
    if found then
      return query select v_bid, v_ref, v_amt;
      return;
    end if;
  end if;

  if p_seats is null or p_seats <= 0 then
    raise exception 'Invalid seat count';
  end if;

  select * into v_dep from departures
    where id = p_departure_id for update;

  if not found then raise exception 'Departure not found'; end if;
  if v_dep.status <> 'open' then raise exception 'Departure is not open'; end if;
  if v_dep.seats_booked + p_seats > v_dep.max_seats then
    raise exception 'Only % seats left', v_dep.max_seats - v_dep.seats_booked;
  end if;

  v_total := (v_dep.price * p_seats)
           + (coalesce(v_dep.single_supplement, 0) * coalesce(p_single_rooms, 0));

  v_ref := 'TP-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into bookings (
    booking_ref, user_id, departure_id, seats,
    single_rooms, total_amount, contact_name, contact_email,
    contact_phone, notes, submit_uuid
  ) values (
    v_ref, auth.uid(), p_departure_id, p_seats,
    coalesce(p_single_rooms, 0), v_total, p_contact_name, p_contact_email,
    p_contact_phone, p_notes, p_submit_uuid
  )
  returning id into v_bid;

  insert into booking_participants (
    booking_id, full_name, cnic_or_passport,
    date_of_birth, dietary, emergency_contact
  )
  select
    v_bid,
    x->>'full_name',
    nullif(x->>'cnic_or_passport', ''),
    nullif(x->>'date_of_birth', '')::date,
    nullif(x->>'dietary', ''),
    nullif(x->>'emergency_contact', '')
  from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) x;

  update departures
    set seats_booked = seats_booked + p_seats
    where id = p_departure_id;

  return query select v_bid, v_ref, v_total;
end;
$$;
