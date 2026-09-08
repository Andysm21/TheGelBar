-- ============================================================
-- The Gel Bar — migration 002
-- Variant pricing (4 services × 3 variants), quantity add-ons,
-- range-based availability, and admin-editable catalog.
--
-- Safe to run more than once. Existing bookings referencing the OLD
-- flat service list are removed (there is no live booking history yet);
-- everything else — profiles, auth users, loyalty points — is kept.
-- ============================================================

begin;

-- ---------- 1. clear out the old booking/catalog model ----------
drop table if exists booking_images cascade;
drop table if exists booking_addons cascade;
delete from bookings;
drop table if exists bookings cascade;
drop table if exists design_options cascade;
drop table if exists services cascade;
drop table if exists availability_slots cascade;

do $$ begin
  create type variant_kind as enum ('color', 'simple', 'complex');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum (
    'pending', 'confirmed', 'needs_reschedule', 'declined', 'cancelled', 'done'
  );
exception when duplicate_object then null; end $$;

-- ---------- 2. catalog ----------
create table services (
  id text primary key,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table service_variants (
  id text primary key,
  service_id text not null references services(id) on delete cascade,
  kind variant_kind not null,
  name_en text not null,
  name_ar text not null,
  price_egp int not null,
  duration_minutes int not null,
  requires_inspo boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  unique (service_id, kind)
);

create table addons (
  id text primary key,
  name_en text not null,
  name_ar text not null,
  description_en text not null default '',
  description_ar text not null default '',
  price_egp int not null,
  duration_minutes int not null default 0,
  is_quantity boolean not null default false,
  max_quantity int not null default 1,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- ---------- 3. bookings ----------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  service_id text not null references services(id),
  variant_id text not null references service_variants(id),
  status booking_status not null default 'pending',
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  total_price_egp int not null,
  total_minutes int not null,
  is_loyalty_free boolean not null default false,
  was_service_completed boolean,
  health_notes text default '',
  tier_change_note text,
  tier_changed_at timestamptz,
  google_event_id text,
  created_at timestamptz not null default now()
);

create table booking_addons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  addon_id text not null references addons(id),
  quantity int not null default 1,
  unit_price_egp int not null,
  unit_duration_minutes int not null default 0
);

create table booking_images (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- ---------- 4. availability as free ranges ----------
create table availability_ranges (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  unique (date, start_time, end_time),
  check (end_time > start_time)
);

create table if not exists blocked_days (date date primary key);

-- ---------- 5. settings ----------
create table if not exists app_settings (
  id int primary key default 1 check (id = 1),
  loyalty_enabled boolean not null default false
);
alter table app_settings add column if not exists slot_step_minutes int not null default 30;
alter table app_settings add column if not exists owner_email text not null default 'thegelbar.eg@gmail.com';
insert into app_settings (id) values (1) on conflict (id) do nothing;

-- ---------- 6. indexes ----------
create index if not exists bookings_client_id_idx on bookings(client_id);
create index if not exists bookings_scheduled_start_idx on bookings(scheduled_start);
create index if not exists bookings_status_idx on bookings(status);
create index if not exists availability_ranges_date_idx on availability_ranges(date);
create index if not exists service_variants_service_idx on service_variants(service_id);
create index if not exists booking_addons_booking_idx on booking_addons(booking_id);

-- ---------- 7. grants ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.bookings to authenticated;
grant select, insert, delete on public.booking_addons to authenticated;
grant select, insert, delete on public.booking_images to authenticated;
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant select on public.service_variants to anon, authenticated;
grant insert, update, delete on public.service_variants to authenticated;
grant select on public.addons to anon, authenticated;
grant insert, update, delete on public.addons to authenticated;
grant select on public.availability_ranges to anon, authenticated;
grant insert, update, delete on public.availability_ranges to authenticated;
grant select on public.app_settings to anon, authenticated;
grant update on public.app_settings to authenticated;
grant select on public.blocked_days to anon, authenticated;
grant insert, update, delete on public.blocked_days to authenticated;

-- ---------- 8. RLS ----------
alter table bookings enable row level security;
alter table booking_addons enable row level security;
alter table booking_images enable row level security;
alter table availability_ranges enable row level security;
alter table services enable row level security;
alter table service_variants enable row level security;
alter table addons enable row level security;

create policy "bookings: client sees own" on bookings for select using (auth.uid() = client_id);
create policy "bookings: client creates own" on bookings for insert with check (auth.uid() = client_id);
create policy "bookings: client updates own" on bookings for update using (auth.uid() = client_id);
create policy "bookings: owner manages all" on bookings for all using (public.is_owner());

create policy "booking_addons: follow parent" on booking_addons for all using (
  exists (select 1 from bookings b where b.id = booking_addons.booking_id
          and (b.client_id = auth.uid() or public.is_owner()))
);

create policy "booking_images: follow parent" on booking_images for all using (
  exists (select 1 from bookings b where b.id = booking_images.booking_id
          and (b.client_id = auth.uid() or public.is_owner()))
);

create policy "availability_ranges: anyone reads" on availability_ranges for select using (true);
create policy "availability_ranges: owner writes" on availability_ranges for insert with check (public.is_owner());
create policy "availability_ranges: owner updates" on availability_ranges for update using (public.is_owner());
create policy "availability_ranges: owner deletes" on availability_ranges for delete using (public.is_owner());

create policy "services: anyone reads" on services for select using (true);
create policy "services: owner writes" on services for all using (public.is_owner());

create policy "service_variants: anyone reads" on service_variants for select using (true);
create policy "service_variants: owner writes" on service_variants for all using (public.is_owner());

create policy "addons: anyone reads" on addons for select using (true);
create policy "addons: owner writes" on addons for all using (public.is_owner());

-- ---------- 9. seed the catalog ----------
insert into services (id, name_en, name_ar, description_en, description_ar, sort_order) values
  ('gel-manicure',     'Gel Manicure',     'مانيكير جل',       '', '', 1),
  ('hard-gel-overlay', 'Hard Gel Overlay', 'هارد جل أوفرلاي',  '', '', 2),
  ('hard-gel-new-set', 'Hard Gel New Set', 'طقم هارد جل جديد', '', '', 3),
  ('false-nails',      'False Nails',      'أظافر صناعية',     '', '', 4)
on conflict (id) do nothing;

insert into service_variants (id, service_id, kind, name_en, name_ar, price_egp, duration_minutes, requires_inspo, sort_order) values
  ('gel-manicure-color',       'gel-manicure',     'color',   'Color',          'لون',          650,  60, false, 1),
  ('gel-manicure-simple',      'gel-manicure',     'simple',  'Simple design',  'تصميم بسيط',   800,  60, true,  2),
  ('gel-manicure-complex',     'gel-manicure',     'complex', 'Complex design', 'تصميم معقد',  1000,  60, true,  3),
  ('hard-gel-overlay-color',   'hard-gel-overlay', 'color',   'Color',          'لون',          850,  60, false, 1),
  ('hard-gel-overlay-simple',  'hard-gel-overlay', 'simple',  'Simple design',  'تصميم بسيط',  1000,  60, true,  2),
  ('hard-gel-overlay-complex', 'hard-gel-overlay', 'complex', 'Complex design', 'تصميم معقد',  1200,  60, true,  3),
  ('hard-gel-new-set-color',   'hard-gel-new-set', 'color',   'Color',          'لون',         1200,  60, false, 1),
  ('hard-gel-new-set-simple',  'hard-gel-new-set', 'simple',  'Simple design',  'تصميم بسيط',  1350,  60, true,  2),
  ('hard-gel-new-set-complex', 'hard-gel-new-set', 'complex', 'Complex design', 'تصميم معقد',  1500,  60, true,  3),
  ('false-nails-color',        'false-nails',      'color',   'Color',          'لون',          550,  60, false, 1),
  ('false-nails-simple',       'false-nails',      'simple',  'Simple design',  'تصميم بسيط',   700,  60, true,  2),
  ('false-nails-complex',      'false-nails',      'complex', 'Complex design', 'تصميم معقد',   850,  60, true,  3)
on conflict (id) do nothing;

insert into addons (id, name_en, name_ar, description_en, description_ar, price_egp, duration_minutes, is_quantity, max_quantity, sort_order) values
  ('removal',  'Removal',      'إزالة',        'Safe removal of your existing set.', 'إزالة آمنة لطقمك الحالي.', 150, 0, false, 1,  1),
  ('nail-fix', 'Fixing nails', 'إصلاح الأظافر', 'Repair per broken nail.',            'إصلاح لكل ظفر مكسور.',       50, 0, true,  10, 2)
on conflict (id) do nothing;

commit;
