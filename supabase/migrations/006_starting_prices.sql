-- ============================================================
-- 006 — "Starts from" pricing for complex designs
-- Safe to re-run.
-- ============================================================
--
-- A complex design is quoted after Mariam sees the inspiration photos, so its
-- listed price is a floor, not a fixed price. This flag lets any option be
-- shown as "Starts from X LE", and it is editable per option in the admin
-- catalogue — nothing about it is hard-coded in the site.

begin;

alter table public.service_variants
  add column if not exists price_is_starting boolean not null default false;

comment on column public.service_variants.price_is_starting is
  'Shown to clients as "Starts from <price>"; the final price is confirmed after the design is reviewed.';

-- The floor prices Mariam gave for each complex design. They replace the
-- previous complex prices, so the number clients see and the number they are
-- quoted are the same one. Existing bookings keep the total they were made at.
update public.service_variants set price_egp = 950,  price_is_starting = true where id = 'gel-manicure-complex';
update public.service_variants set price_egp = 1100, price_is_starting = true where id = 'hard-gel-overlay-complex';
update public.service_variants set price_egp = 1450, price_is_starting = true where id = 'hard-gel-new-set-complex';
update public.service_variants set price_egp = 750,  price_is_starting = true where id = 'false-nails-complex';

commit;

-- Check
select id, price_egp, price_is_starting
from public.service_variants
where price_is_starting
order by id;
-- expect 4 rows: false-nails-complex 750, gel-manicure-complex 950,
--                hard-gel-new-set-complex 1450, hard-gel-overlay-complex 1100
