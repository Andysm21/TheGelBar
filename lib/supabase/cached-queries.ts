import { cache } from 'react';
import { createClient } from './server';

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

export const getServiceCatalog = cache(async () => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('services')
    .select('id, name_en, name_ar, base_price_egp, base_minutes, design_tier')
    .eq('is_active', true);
  if (error) throw error;
  return data;
});

export const getDesignOptions = cache(async () => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('design_options')
    .select('id, name_en, name_ar, price_egp, tier')
    .eq('is_active', true);
  if (error) throw error;
  return data;
});

/** One query for the whole visible month grid — never per-day. */
export const getMonthAvailability = cache(async (year: number, month: number) => {
  const supabase = createClient();
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${endDate}`;

  const { data, error } = await supabase
    .from('availability_slots')
    .select('date, start_time, is_blocked')
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;
  return data;
});

/**
 * Bookings for a client, joined with the service/design names in the SAME
 * query — this is the join that avoids fetching each booking's service
 * separately (the N+1 that would otherwise happen on the bookings list).
 */
export const getClientBookings = cache(async (clientId: string) => {
  const supabase = createClient();
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
  return data;
});

export const getPendingBookingsForOwner = cache(async () => {
  const supabase = createClient();
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
  return data;
});
