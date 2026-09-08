-- Owner accounts must not hold bookings.
--
-- The app already refuses this in two places (the /book page redirects and
-- createBooking throws), but those live in code that can be changed or
-- bypassed. This is the backstop: the database itself will not accept a
-- booking row whose client is the salon owner.

-- Replace the client insert policy with one that also excludes owners.
drop policy if exists "bookings: client creates own" on public.bookings;
drop policy if exists "bookings: client inserts own" on public.bookings;

create policy "bookings: client creates own"
  on public.bookings
  for insert
  to authenticated
  with check (
    client_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'client'
    )
  );

-- Same rule for anything that later tries to move a booking onto the owner.
create or replace function public.reject_owner_bookings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.profiles p
    where p.id = new.client_id and p.role = 'owner'
  ) then
    raise exception 'The salon account cannot hold a booking';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_reject_owner on public.bookings;

create trigger bookings_reject_owner
  before insert or update of client_id on public.bookings
  for each row
  execute function public.reject_owner_bookings();
