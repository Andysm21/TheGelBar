-- ============================================================
-- 007 — give the server's service_role access to the tables
-- Safe to re-run. Run in the SQL editor as the "postgres" role.
-- ============================================================
--
-- This project does not hand out table privileges automatically, so each
-- migration has had to grant them explicitly (the "block whole day" crash was
-- exactly that). service_role skips row-level security, but it still needs
-- table privileges, and it never got any: reading bookings with it failed with
--
--   42501 permission denied for table bookings
--
-- That broke everything that runs without a signed-in user or needs to see
-- more than one client's data:
--   * Google Calendar sync (bookings, google_calendar)
--   * the daily reminder email job (bookings, profiles)
--
-- service_role is only ever used by the server, and its key is never sent to a
-- browser, so full access here is the intended design rather than a loophole.

grant usage on schema public to service_role;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Tables added by later migrations get the same access automatically.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;

-- Check: every row should say true.
select
  has_table_privilege('service_role', 'public.bookings',        'select, update') as bookings,
  has_table_privilege('service_role', 'public.google_calendar', 'select')         as google_calendar,
  has_table_privilege('service_role', 'public.profiles',        'select')         as profiles,
  has_table_privilege('service_role', 'public.services',        'select')         as services;
