import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from './server';
import { createPublicClient } from './public';

// Every function here is wrapped in React's `cache()`, which de-dupes
// identical calls within a single request/render pass — if three
// components on one page each need the service catalog, this hits
// Supabase once, not three times. Combined with the rules below, this is
// the whole egress strategy: no N+1, no redundant round trips.
//
// Rules this file follows (apply the same pattern to any new query):
// 1. Select only the columns a page actually renders — never `select('*')`
//    on a wide table when three columns are shown.
// 2. Fetch a whole month of availability/bookings in ONE query
//    (`.gte('date', start).lte('date', end)`), never one query per day.
// 3. Use Supabase's embedded resource syntax to join in one round trip
//    (e.g. `.select('*, services(name_en, base_price_egp)')`) instead of
//    fetching a booking then separately fetching its service — that's
//    the classic N+1.
// 4. Static, rarely-changing data (the service catalog, design options)
//    is a great candidate for `unstable_cache` with a long
//    `revalidate` + on-demand `revalidateTag` from the admin "save"
//    action, so most requests never touch the DB at all.

// Services/design options change only from the admin "Services" screen
// (not built as an edit UI yet — currently seeded once via schema.sql),
// so these are safe to cache across requests, not just within one:
// unstable_cache with a tag means near-zero Supabase egress for these
// reads until someone explicitly revalidates the tag.
export const getServiceCatalog = cache(
  unstable_cache(
    async () => {
      // Cookie-free client here on purpose: unstable_cache forbids
      // calling dynamic APIs like cookies() inside its cached function
      // (Next.js throws "used ... inside unstable_cache" at runtime) —
      // this data has no per-user variation anyway, so a plain anon
      // client is both correct and required.
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from('services')
        .select('id, name_en, name_ar, description_en, description_ar, base_price_egp, base_minutes, design_tier')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    ['service-catalog'],
    { revalidate: 3600, tags: ['services'] }
  )
);

export const getDesignOptions = cache(
  unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from('design_options')
        .select('id, name_en, name_ar, price_egp, tier')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    ['design-options'],
    { revalidate: 3600, tags: ['services'] }
  )
);

/** Loyalty on/off — cached briefly, not per-request only, since admin flips it rarely. */
export const getAppSettings = cache(
  unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase.from('app_settings').select('loyalty_enabled').eq('id', 1).single();
      if (error) throw error;
      return data;
    },
    ['app-settings'],
    { revalidate: 60, tags: ['app-settings'] }
  )
);

/**
 * One query for the whole visible month grid — never per-day. Blocked
 * days are a separate table (blocked_days), not a per-slot flag, so a
 * day with zero slots is still blockable.
 */
export const getMonthAvailability = cache(async (year: number, month: number) => {
  const supabase = await createClient();
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${endDate}`;

  const [{ data: slots, error: slotsError }, { data: blockedRows, error: blockedError }] = await Promise.all([
    supabase.from('availability_slots').select('date, start_time').gte('date', start).lte('date', end),
    supabase.from('blocked_days').select('date').gte('date', start).lte('date', end),
  ]);
  if (slotsError) throw slotsError;
  if (blockedError) throw blockedError;
  return { slots: slots ?? [], blockedDates: (blockedRows ?? []).map((r) => r.date) };
});

/**
 * Bookings for a client, joined with the service/design names in the SAME
 * query — this is the join that avoids fetching each booking's service
 * separately (the N+1 that would otherwise happen on the bookings list).
 */
export const getClientBookings = cache(async (clientId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, status, scheduled_start, scheduled_end, total_price_egp, is_loyalty_free,
       services ( name_en, name_ar ),
       design_options ( name_en, name_ar )`
    )
    .eq('client_id', clientId)
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return data as any;
});

export const getPendingBookingsForOwner = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, status, scheduled_start, total_price_egp,
       profiles ( name ),
       services ( name_en )`
    )
    .eq('status', 'pending')
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return data as any;
});

/** All bookings on a given day (used by admin calendar's day panel). */
export const getBookingsForDate = cache(async (date: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, status, scheduled_start, scheduled_end,
       profiles ( name ),
       services ( name_en )`
    )
    .gte('scheduled_start', `${date}T00:00:00`)
    .lt('scheduled_start', `${date}T23:59:59`)
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return data as any;
});

/** Single booking with everything the admin detail / close-out screen needs. */
export const getBookingById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, status, scheduled_start, scheduled_end, total_price_egp, is_loyalty_free,
       health_notes, service_id, design_id, was_service_completed, was_design_completed,
       client_id,
       profiles ( name, email, loyalty_points, admin_private_notes ),
       services ( name_en, name_ar, base_price_egp ),
       design_options ( name_en, name_ar, price_egp )`
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as any;
});

/** Every booking for the admin dashboard's "today" list — one day, one query. */
export const getTodayBookings = cache(async () => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, status, scheduled_start, total_price_egp,
       profiles ( name ),
       services ( name_en )`
    )
    .gte('scheduled_start', `${today}T00:00:00`)
    .lt('scheduled_start', `${today}T23:59:59`)
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return data as any;
});

/** All clients (profiles with role='client') for the admin clients page. */
export const getAllClients = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, loyalty_points, admin_private_notes')
    .eq('role', 'client')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
});

/** One client's full visit history (for their admin profile page). */
export const getClientHistory = cache(async (clientId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `id, status, scheduled_start, total_price_egp,
       services ( name_en )`
    )
    .eq('client_id', clientId)
    .eq('status', 'done')
    .order('scheduled_start', { ascending: false });
  if (error) throw error;
  return data;
});

/** Simple real aggregates for the analytics page — no fabricated numbers. */
export const getAnalyticsSummary = cache(async () => {
  const supabase = await createClient();
  const { data: done, error } = await supabase
    .from('bookings')
    .select('total_price_egp, client_id, scheduled_start')
    .eq('status', 'done');
  if (error) throw error;

  const revenue = done.reduce((sum, b) => sum + b.total_price_egp, 0);
  const bookingCount = done.length;
  const avgTicket = bookingCount > 0 ? Math.round(revenue / bookingCount) : 0;
  const uniqueClients = new Set(done.map((b) => b.client_id));
  const clientVisitCounts = new Map<string, number>();
  for (const b of done) clientVisitCounts.set(b.client_id, (clientVisitCounts.get(b.client_id) ?? 0) + 1);
  const repeatClients = [...clientVisitCounts.values()].filter((n) => n > 1).length;
  const repeatPct = uniqueClients.size > 0 ? Math.round((repeatClients / uniqueClients.size) * 100) : 0;

  return { revenue, bookingCount, avgTicket, repeatPct };
});

/**
 * Open time slots for one date: every availability_slots row for that
 * day, minus any that overlap an existing non-cancelled/declined
 * booking — or all of them, if the whole day is in blocked_days.
 */
export const getOpenTimesForDate = cache(async (date: string) => {
  const supabase = await createClient();
  const [{ data: slots, error: slotsError }, { data: bookings, error: bookingsError }, { data: blockedRows, error: blockedError }] =
    await Promise.all([
      supabase.from('availability_slots').select('start_time').eq('date', date),
      supabase
        .from('bookings')
        .select('scheduled_start')
        .gte('scheduled_start', `${date}T00:00:00`)
        .lt('scheduled_start', `${date}T23:59:59`)
        .in('status', ['pending', 'confirmed', 'needs_reschedule']),
      supabase.from('blocked_days').select('date').eq('date', date),
    ]);
  if (slotsError) throw slotsError;
  if (bookingsError) throw bookingsError;
  if (blockedError) throw blockedError;
  if (blockedRows && blockedRows.length > 0) return [];

  const bookedTimes = new Set((bookings ?? []).map((b) => new Date(b.scheduled_start).toTimeString().slice(0, 5)));
  return (slots ?? []).filter((s) => !bookedTimes.has(s.start_time.slice(0, 5)));
});
