-- The Gel Bar — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
--
-- IMPORTANT: the booking model changed (one service + one optional design
-- per booking, replacing an earlier multi-service join table). If you
-- already ran an older version of this file, reset first — safe since
-- there's no real data yet:
--
--   drop schema public cascade;
--   create schema public;
--   grant all on schema public to postgres, anon, authenticated, service_role;
--
-- Then run this entire file fresh. See DEPLOY.md for setup order.

create type booking_status as enum (
  'pending', 'confirmed', 'needs_reschedule', 'declined', 'cancelled', 'done'
);

create type design_tier as enum ('none', 'simple', 'complex');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'owner')),
  name text,
  email text,
  phone text,
  loyalty_points int not null default 0,
  admin_private_notes text,
  created_at timestamptz not null default now()
);

-- One row per bookable service. `design_tier` says whether a booking of
-- this service must also pick a design_option, and from which tier.
create table services (
  id text primary key,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  base_price_egp int not null,
  base_minutes int not null,
  design_tier design_tier not null default 'none',
  is_active boolean not null default true
);

-- Nail-art add-ons. `tier` must match the service's design_tier for a
-- given booking (enforced in application code, not a DB constraint,
-- since it's a cross-table rule).
create table design_options (
  id text primary key,
  name_en text not null,
  name_ar text not null,
  price_egp int not null,
  tier design_tier not null check (tier in ('simple', 'complex')),
  is_active boolean not null default true
);

-- A booking is exactly one service + at most one design option.
create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  service_id text not null references services(id),
  design_id text references design_options(id),
  status booking_status not null default 'pending',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  total_price_egp int not null,
  is_loyalty_free boolean not null default false,
  was_service_completed boolean, -- null until owner closes the session
  was_design_completed boolean,
  health_notes text default '',
  google_event_id text,
  created_at timestamptz not null default now()
);

create table booking_images (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  storage_path text not null
);

-- Owner-managed open slots. One row per bookable start time; a booking
-- occupies exactly the slots covered by its scheduled_start/end range
-- (checked in application code when creating a booking, to keep this
-- table simple and cheap to query per month).
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  is_blocked boolean not null default false,
  unique (date, start_time)
);

-- Single-row app settings (currently just the loyalty on/off switch).
-- `id` is pinned to 1 so there's always exactly one row to upsert/read.
create table app_settings (
  id int primary key default 1 check (id = 1),
  loyalty_enabled boolean not null default false
);
insert into app_settings (id, loyalty_enabled) values (1, false) on conflict (id) do nothing;

-- Whole days the owner has blocked off. Separate from availability_slots
-- on purpose: a day with zero slot rows still needs to be blockable, and
-- toggling is_blocked on a per-slot basis can't represent "blocked" for
-- a day that has no slots yet.
create table blocked_days (
  date date primary key
);

create index bookings_client_id_idx on bookings(client_id);
create index bookings_scheduled_start_idx on bookings(scheduled_start);
create index bookings_status_idx on bookings(status);
create index availability_slots_date_idx on availability_slots(date);

-- Base table-level grants. RLS policies below control WHICH rows a role
-- can touch, but Postgres also requires this separate, coarser
-- table-level permission before RLS is even consulted — normally set up
-- automatically by Supabase's own project bootstrapping, but NOT
-- reapplied if you ever manually `drop schema public cascade` and rerun
-- this file, which is exactly the reset flow documented in DEPLOY.md.
-- Without these grants every query fails with 42501 "permission denied"
-- regardless of how correct the RLS policies are.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert on public.booking_images to authenticated;
grant select on public.services to anon, authenticated;
grant select on public.design_options to anon, authenticated;
grant select on public.availability_slots to anon, authenticated;
grant insert, update, delete on public.availability_slots to authenticated;
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant select on public.blocked_days to anon, authenticated;
grant insert, delete on public.blocked_days to authenticated;

-- Row Level Security: clients only see their own bookings/profile,
-- owner (role = 'owner') sees everything.
--
-- A policy ON `profiles` can't query `profiles` directly in its own
-- USING clause — Postgres re-applies RLS to that subquery, which
-- re-triggers the same policy, infinitely (error 42P17). The fix is a
-- SECURITY DEFINER function: it runs with the privileges of whoever
-- created it (bypassing RLS internally), so checking "is this caller an
-- owner" no longer recurses through the policy that's asking the
-- question. Every owner-facing policy below calls this instead of
-- inlining the subquery.
create or replace function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

alter table profiles enable row level security;
alter table bookings enable row level security;
alter table booking_images enable row level security;
alter table app_settings enable row level security;

create policy "app_settings: anyone reads" on app_settings
  for select using (true);

create policy "app_settings: owner updates" on app_settings
  for update using (public.is_owner());

alter table availability_slots enable row level security;

create policy "availability_slots: anyone reads" on availability_slots
  for select using (true);

create policy "availability_slots: owner writes" on availability_slots
  for insert with check (public.is_owner());

create policy "availability_slots: owner updates" on availability_slots
  for update using (public.is_owner());

create policy "availability_slots: owner deletes" on availability_slots
  for delete using (public.is_owner());

alter table blocked_days enable row level security;

create policy "blocked_days: anyone reads" on blocked_days
  for select using (true);

create policy "blocked_days: owner writes" on blocked_days
  for insert with check (public.is_owner());

create policy "blocked_days: owner deletes" on blocked_days
  for delete using (public.is_owner());

create policy "profiles: self read/write" on profiles
  for all using (auth.uid() = id);

create policy "profiles: owner reads all" on profiles
  for select using (public.is_owner());

create policy "bookings: client sees own" on bookings
  for select using (auth.uid() = client_id);

create policy "bookings: client creates own" on bookings
  for insert with check (auth.uid() = client_id);

create policy "bookings: owner sees/manages all" on bookings
  for all using (public.is_owner());

create policy "booking_images: follow parent booking" on booking_images
  for all using (
    exists (
      select 1 from bookings b
      where b.id = booking_images.booking_id
        and (b.client_id = auth.uid() or public.is_owner())
    )
  );

-- Seed the final confirmed service catalog. This is the only source of
-- truth for services now — the app has no hardcoded catalog in code.
insert into services (id, name_en, name_ar, description_en, description_ar, base_price_egp, base_minutes, design_tier) values
  ('gel-manicure', 'Gel manicure', 'مانيكير جل', 'Color or a simple design (french/chrome) on your natural nails.', 'لون أو تصميم بسيط (فرنش/كروم) على أظافرك الطبيعية.', 650, 120, 'simple'),
  ('hard-gel-overlay', 'Hard gel overlay', 'هارد جل أوفرلاي', 'A protective hard gel layer over your natural nails, with color or a simple design.', 'طبقة هارد جل واقية فوق أظافرك الطبيعية، مع لون أو تصميم بسيط.', 850, 120, 'simple'),
  ('hard-gel-new-set-simple', 'Hard gel new set — simple design', 'طقم هارد جل جديد - تصميم بسيط', 'A full new hard gel set with a simple design.', 'طقم هارد جل جديد بالكامل مع تصميم بسيط.', 1200, 180, 'simple'),
  ('hard-gel-new-set-complex', 'Hard gel new set — complex design', 'طقم هارد جل جديد - تصميم معقد', 'A full new hard gel set with a complex, detailed design.', 'طقم هارد جل جديد بالكامل مع تصميم معقد ومفصل.', 1200, 240, 'complex'),
  ('removal-only', 'Removal only', 'إزالة فقط', 'Safe removal of your existing gel or hard gel set.', 'إزالة آمنة لطقم الجل أو الهارد جل الحالي.', 150, 45, 'none'),
  ('false-nails-simple', 'False nails — simple design', 'أظافر صناعية - تصميم بسيط', 'Press-on style false nails with a simple design.', 'أظافر صناعية بتصميم بسيط.', 550, 90, 'simple'),
  ('false-nails-complex', 'False nails — complex design', 'أظافر صناعية - تصميم معقد', 'Press-on style false nails with a complex, detailed design.', 'أظافر صناعية بتصميم معقد ومفصل.', 550, 150, 'complex'),
  ('nail-fix-one', 'Fixing one nail', 'إصلاح ظفر واحد', 'Quick repair for a single broken or damaged nail.', 'إصلاح سريع لظفر واحد مكسور أو تالف.', 50, 20, 'none');

insert into design_options (id, name_en, name_ar, price_egp, tier) values
  ('chrome-cateye-ombre', 'Chrome / cat-eye / ombré', 'كروم / كات آي / أومبريه', 100, 'simple'),
  ('french', 'French', 'فرنش', 150, 'simple'),
  ('simple-design', 'Simple design', 'تصميم بسيط', 150, 'simple'),
  ('complex-design', 'Complex design', 'تصميم معقد', 300, 'complex');

-- Auto-create a `profiles` row for every new auth user, whichever SSO
-- provider they came through (Google now, Apple later) — this is what
-- "SSO accounts saved in our DB" means in practice: Supabase Auth owns
-- the credential, this trigger mirrors the account into our own table
-- the rest of the app actually queries, so no separate signup API call
-- is ever needed (one less round trip, avoids a race with the first
-- page that reads `profiles`).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.email,
    'client'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage bucket for inspo photos + gallery images. This creates it
-- programmatically; if your Supabase plan/version rejects direct inserts
-- into storage.buckets, create it manually instead (Storage → New bucket
-- → name it exactly `inspo-images`, keep it private) and just run the
-- two policies below.
insert into storage.buckets (id, name, public)
values ('inspo-images', 'inspo-images', false)
on conflict (id) do nothing;

create policy "inspo-images: clients upload their own"
  on storage.objects for insert
  with check (
    bucket_id = 'inspo-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "inspo-images: clients read their own, owner reads all"
  on storage.objects for select
  using (
    bucket_id = 'inspo-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
    )
  );
