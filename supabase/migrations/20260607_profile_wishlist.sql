-- Profile polish + wishlist persistence.

-- 1. Username sequence + generator. Called from findOrCreateUserForBooking
--    to assign a default `traverser{N}` handle when a new auth.users row is
--    silent-created. User can rename later in Settings.
create sequence if not exists public.traverser_username_seq start 1;

create or replace function public.next_traverser_username()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n int;
  candidate text;
begin
  -- Loop in case a manual rename ever collides with the sequence's next value.
  loop
    n := nextval('traverser_username_seq');
    candidate := 'traverser' || lpad(n::text, 2, '0');
    if not exists (
      select 1 from auth.users where raw_user_meta_data->>'username' = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;

revoke all on function public.next_traverser_username() from public, anon, authenticated;
grant execute on function public.next_traverser_username() to service_role;

-- 2. Wishlist table. Composite PK enforces dedup; RLS scopes to the row owner.
create table if not exists public.wishlists (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  item_type  text        not null check (item_type in ('tour', 'package', 'hotel')),
  item_slug  text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_slug)
);

create index if not exists wishlists_user_id_created_at_idx
  on public.wishlists (user_id, created_at desc);

alter table public.wishlists enable row level security;

drop policy if exists "Users see own wishlist"    on public.wishlists;
drop policy if exists "Users add to own wishlist" on public.wishlists;
drop policy if exists "Users remove own wishlist" on public.wishlists;

create policy "Users see own wishlist"
  on public.wishlists for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users add to own wishlist"
  on public.wishlists for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users remove own wishlist"
  on public.wishlists for delete
  to authenticated
  using (auth.uid() = user_id);
