-- ============================================================
-- 003 — owner cannot book + recording what was actually paid
-- Safe to re-run.
-- ============================================================

-- ---------- 1. Owner accounts must not hold bookings ----------
--
-- The app already refuses this in two places (the /book page redirects and
-- createBooking throws), but those live in code that can be changed or
-- bypassed. This is the backstop: the database itself will not accept a
-- booking row whose client is the salon owner.

drop policy if exists "bookings: client creates own" on public.bookings;
drop policy if exists "bookings: client inserts own" on public.bookings;

create policy "bookings: client creates own"
  on public.bookings
  for insert
  to authenticated
  with check (
    client_id = auth.uid()
    -- Phrased as "not the owner" rather than "is a client": a profile row
    -- with a missing or unexpected role should still be able to book.
    and not exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'owner'
    )
  );

-- Also catch anything that later tries to move a booking onto the owner.
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


-- ---------- 2. What was actually collected ----------
--
-- total_price_egp stays the quoted price — the number the system worked
-- out. These record what the client really handed over and why it
-- differed, so a discount or a goodwill adjustment is visible later
-- instead of silently overwriting the quote.

alter table public.bookings
  add column if not exists amount_paid_egp int,
  add column if not exists payment_note text,
  add column if not exists paid_at timestamptz;

comment on column public.bookings.amount_paid_egp is
  'What the client actually paid. Null until the booking is marked done.';
comment on column public.bookings.payment_note is
  'Why the amount paid differs from total_price_egp (discount, goodwill, etc).';


-- ---------- 3. Check ----------
select
  (select count(*) from pg_policies
    where tablename = 'bookings' and policyname = 'bookings: client creates own') as insert_policy,
  (select count(*) from pg_trigger
    where tgname = 'bookings_reject_owner') as owner_trigger,
  (select count(*) from information_schema.columns
    where table_name = 'bookings'
      and column_name in ('amount_paid_egp', 'payment_note', 'paid_at')) as payment_columns;
-- expect: insert_policy = 1, owner_trigger = 1, payment_columns = 3
