-- ============================================================
-- 004 — Add-ons become a main service, with per-unit variants
-- Safe to re-run.
-- ============================================================
--
-- Removal and nail fixing used to be extras bolted onto another booking.
-- They are now a service in their own right ("Add-ons"), with the same
-- shape as every other service: pick the service, then pick exactly one
-- option under it. Fixing nails is priced per nail, so a variant can now
-- carry a quantity.

begin;

-- ---------- 1. variants are no longer limited to colour/simple/complex ----------
-- `kind` was an enum, which meant a new kind of option needed a schema
-- change. Text keeps the catalogue editable from the admin panel.
alter table public.service_variants
  alter column kind type text using kind::text;

-- ---------- 2. a variant can be priced per unit ----------
alter table public.service_variants
  add column if not exists is_quantity boolean not null default false,
  add column if not exists max_quantity int not null default 1;

comment on column public.service_variants.is_quantity is
  'Client chooses how many (e.g. one price per broken nail).';

-- ---------- 3. bookings remember how many units were chosen ----------
alter table public.bookings
  add column if not exists variant_quantity int not null default 1;

-- ---------- 4. the new service ----------
insert into public.services (id, name_en, name_ar, description_en, description_ar, sort_order, is_active)
values (
  'add-ons',
  'Add-ons',
  'إضافات',
  'Removal and repairs, booked on their own.',
  'الإزالة والإصلاحات، تُحجز بمفردها.',
  5,
  true
)
on conflict (id) do update
  set name_en = excluded.name_en,
      name_ar = excluded.name_ar,
      is_active = true;

insert into public.service_variants
  (id, service_id, kind, name_en, name_ar, price_egp, duration_minutes, requires_inspo, sort_order, is_quantity, max_quantity)
values
  ('add-ons-removal',  'add-ons', 'removal', 'Removal',      'إزالة',        150, 60, false, 1, false,  1),
  ('add-ons-nail-fix', 'add-ons', 'fix',     'Fixing nails', 'إصلاح الأظافر',  50, 15, false, 2, true,  10)
on conflict (id) do nothing;

-- ---------- 5. retire the old extras ----------
-- The rows stay so past bookings still read correctly; they just stop
-- being offered. booking_addons is untouched.
update public.addons set is_active = false;

commit;

-- ---------- 6. Check ----------
select
  (select count(*) from public.service_variants where service_id = 'add-ons') as addon_variants,
  (select count(*) from information_schema.columns
    where table_name = 'service_variants' and column_name in ('is_quantity', 'max_quantity')) as variant_qty_columns,
  (select count(*) from information_schema.columns
    where table_name = 'bookings' and column_name = 'variant_quantity') as booking_qty_column,
  (select count(*) from public.addons where is_active) as live_legacy_addons;
-- expect: addon_variants = 2, variant_qty_columns = 2, booking_qty_column = 1, live_legacy_addons = 0
