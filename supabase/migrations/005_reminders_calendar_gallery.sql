-- ============================================================
-- 005 — reminders, Google Calendar sync, editable photos
-- Safe to re-run.
-- ============================================================

begin;

-- ---------- 1. 24-hour reminders ----------
-- Stamped when the reminder goes out, so the daily job never sends twice.
alter table public.bookings
  add column if not exists reminder_sent_at timestamptz;

create index if not exists bookings_reminder_due_idx
  on public.bookings (scheduled_start)
  where status = 'confirmed' and reminder_sent_at is null;

-- ---------- 2. Google Calendar connection ----------
-- One row: the owner's Google refresh token. Only the owner can see or
-- change it; the server reads it with the service-role key.
create table if not exists public.google_calendar (
  id int primary key default 1 check (id = 1),
  google_email text,
  refresh_token text not null,
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now()
);

alter table public.google_calendar enable row level security;

drop policy if exists "google_calendar: owner only" on public.google_calendar;
create policy "google_calendar: owner only"
  on public.google_calendar for all
  using (public.is_owner())
  with check (public.is_owner());

grant select, insert, update, delete on public.google_calendar to authenticated;

-- ---------- 3. Our Work gallery ----------
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.gallery_images enable row level security;

drop policy if exists "gallery_images: anyone reads" on public.gallery_images;
create policy "gallery_images: anyone reads"
  on public.gallery_images for select using (true);

drop policy if exists "gallery_images: owner writes" on public.gallery_images;
create policy "gallery_images: owner writes"
  on public.gallery_images for all
  using (public.is_owner())
  with check (public.is_owner());

grant select on public.gallery_images to anon, authenticated;
grant insert, update, delete on public.gallery_images to authenticated;

-- ---------- 4. Service photos ----------
alter table public.services
  add column if not exists image_path text;

-- ---------- 5. Public bucket for site photos ----------
-- Public read (these are marketing photos), owner-only write.
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do update set public = true;

drop policy if exists "site-images: anyone reads" on storage.objects;
create policy "site-images: anyone reads"
  on storage.objects for select
  using (bucket_id = 'site-images');

drop policy if exists "site-images: owner uploads" on storage.objects;
create policy "site-images: owner uploads"
  on storage.objects for insert
  with check (bucket_id = 'site-images' and public.is_owner());

drop policy if exists "site-images: owner updates" on storage.objects;
create policy "site-images: owner updates"
  on storage.objects for update
  using (bucket_id = 'site-images' and public.is_owner());

drop policy if exists "site-images: owner deletes" on storage.objects;
create policy "site-images: owner deletes"
  on storage.objects for delete
  using (bucket_id = 'site-images' and public.is_owner());

commit;

-- ---------- 6. Check ----------
select
  (select count(*) from information_schema.columns
    where table_name = 'bookings' and column_name = 'reminder_sent_at') as reminder_column,
  (select count(*) from information_schema.tables
    where table_name in ('google_calendar', 'gallery_images')) as new_tables,
  (select count(*) from information_schema.columns
    where table_name = 'services' and column_name = 'image_path') as service_image_column,
  (select count(*) from storage.buckets where id = 'site-images' and public) as public_bucket;
-- expect: 1, 2, 1, 1
