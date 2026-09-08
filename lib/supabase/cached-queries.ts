import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createClient } from './server';
import { createPublicClient } from './public';

// Read layer. Rules:
// 1. Select only the columns a page renders.
// 2. One query per month/day, never per row (no N+1).
// 3. Use embedded resources to join in a single round trip.
// 4. Catalog data (services/variants/addons/settings) is world-readable
//    and changes rarely — cached with unstable_cache + a tag, and read
//    through a cookie-free client (unstable_cache forbids cookies()).

const BOOKING_SELECT = `
  id, status, scheduled_start, scheduled_end, total_price_egp, total_minutes,
  is_loyalty_free, health_notes, service_id, variant_id, client_id,
  amount_paid_egp, payment_note, paid_at,
  tier_change_note, tier_changed_at, created_at,
  services ( name_en, name_ar ),
  service_variants ( id, name_en, name_ar, kind, price_egp, duration_minutes, requires_inspo ),
  booking_addons ( id, quantity, unit_price_egp, unit_duration_minutes, addons ( id, name_en, name_ar ) ),
  booking_images ( id, storage_path )
`;

/* ---------------- catalog ---------------- */

export const getServiceCatalog = cache(
  unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from('services')
        .select(
          `id, name_en, name_ar, description_en, description_ar, sort_order,
           service_variants ( id, kind, name_en, name_ar, price_egp, duration_minutes, requires_inspo, sort_order, is_active )`
        )
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      // keep variants ordered and drop inactive ones
      return (data ?? []).map((s: any) => ({
        ...s,
        service_variants: (s.service_variants ?? [])
          .filter((v: any) => v.is_active)
          .sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
    },
    ['service-catalog-v2'],
    { revalidate: 3600, tags: ['catalog'] }
  )
);

export const getAddons = cache(
  unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from('addons')
        .select('id, name_en, name_ar, description_en, description_ar, price_egp, duration_minutes, is_quantity, max_quantity, sort_order')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
    ['addons-v1'],
    { revalidate: 3600, tags: ['catalog'] }
  )
);

export const getAppSettings = cache(
  unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from('app_settings')
        .select('loyalty_enabled, slot_step_minutes, owner_email')
        .eq('id', 1)
        .single();
      if (error) throw error;
      return data;
    },
    ['app-settings-v2'],
    { revalidate: 60, tags: ['app-settings'] }
  )
);

/** Full catalog including inactive rows — admin editor only. */
export const getCatalogForAdmin = cache(async () => {
  const supabase = await createClient();
  const [services, addons] = await Promise.all([
    supabase
      .from('services')
      .select(
        `id, name_en, name_ar, description_en, description_ar, sort_order, is_active,
         service_variants ( id, kind, name_en, name_ar, price_egp, duration_minutes, requires_inspo, sort_order, is_active )`
      )
      .order('sort_order'),
    supabase.from('addons').select('*').order('sort_order'),
  ]);
  if (services.error) throw services.error;
  if (addons.error) throw addons.error;
  return {
    services: (services.data ?? []).map((s: any) => ({
      ...s,
      service_variants: (s.service_variants ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    })),
    addons: addons.data ?? [],
  };
});

/* ---------------- availability ---------------- */

/** Free ranges + blocked days + booked spans for a whole month, in 3 queries. */
export const getMonthAvailability = cache(async (year: number, month: number) => {
  const supabase = await createClient();
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`;

  const [ranges, blocked, bookings] = await Promise.all([
    supabase.from('availability_ranges').select('id, date, start_time, end_time').gte('date', start).lte('date', end),
    supabase.from('blocked_days').select('date').gte('date', start).lte('date', end),
    supabase
      .from('bookings')
      .select('id, scheduled_start, scheduled_end')
      .gte('scheduled_start', `${start}T00:00:00`)
      .lte('scheduled_start', `${end}T23:59:59`)
      .in('status', ['pending', 'confirmed', 'needs_reschedule']),
  ]);
  if (ranges.error) throw ranges.error;
  if (blocked.error) throw blocked.error;
  if (bookings.error) throw bookings.error;

  return {
    ranges: ranges.data ?? [],
    blockedDates: (blocked.data ?? []).map((b: any) => b.date),
    bookings: bookings.data ?? [],
  };
});

/* ---------------- bookings ---------------- */

export const getClientBookings = cache(async (clientId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('client_id', clientId)
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
});

export const getPendingBookingsForOwner = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`${BOOKING_SELECT}, profiles ( name, email )`)
    .eq('status', 'pending')
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
});

export const getAllBookingsForOwner = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`${BOOKING_SELECT}, profiles ( name, email )`)
    .order('scheduled_start', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as any[];
});

export const getBookingsForDate = cache(async (date: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`${BOOKING_SELECT}, profiles ( name, email )`)
    .gte('scheduled_start', `${date}T00:00:00`)
    .lt('scheduled_start', `${date}T23:59:59`)
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
});

export const getBookingById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`${BOOKING_SELECT}, profiles ( id, name, email, loyalty_points, admin_private_notes )`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as any;
});

export const getTodayBookings = cache(async () => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('bookings')
    .select(`${BOOKING_SELECT}, profiles ( name, email )`)
    .gte('scheduled_start', `${today}T00:00:00`)
    .lt('scheduled_start', `${today}T23:59:59`)
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return (data ?? []) as any[];
});

/** Signed URLs for a booking's inspiration photos (bucket is private). */
export const getBookingImageUrls = cache(async (paths: string[]) => {
  if (paths.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('inspo-images').createSignedUrls(paths, 60 * 60);
  if (error) return [];
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
});

/* ---------------- clients / analytics ---------------- */

export const getAllClients = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, loyalty_points, admin_private_notes, created_at')
    .eq('role', 'client')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
});

export const getClientProfile = cache(async (clientId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, phone, loyalty_points, admin_private_notes, created_at')
    .eq('id', clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
});

export const getClientHistory = cache(async (clientId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`id, status, scheduled_start, total_price_egp, amount_paid_egp, services ( name_en )`)
    .eq('client_id', clientId)
    .eq('status', 'done')
    .order('scheduled_start', { ascending: false });
  if (error) throw error;
  return data ?? [];
});

export const getAnalyticsSummary = cache(async () => {
  const supabase = await createClient();
  const { data: done, error } = await supabase
    .from('bookings')
    .select('total_price_egp, amount_paid_egp, client_id, scheduled_start')
    .eq('status', 'done');
  if (error) throw error;

  // Revenue is money actually collected. Rows closed before payment
  // recording existed have no amount, so they fall back to the quote.
  const collected = (b: any) => (b.amount_paid_egp ?? b.total_price_egp) as number;
  const revenue = done.reduce((sum: number, b: any) => sum + collected(b), 0);
  const bookingCount = done.length;
  const avgTicket = bookingCount > 0 ? Math.round(revenue / bookingCount) : 0;
  const uniqueClients = new Set(done.map((b: any) => b.client_id));
  const counts = new Map<string, number>();
  for (const b of done as any[]) counts.set(b.client_id, (counts.get(b.client_id) ?? 0) + 1);
  const repeatClients = [...counts.values()].filter((n) => n > 1).length;
  const repeatPct = uniqueClients.size > 0 ? Math.round((repeatClients / uniqueClients.size) * 100) : 0;

  return { revenue, bookingCount, avgTicket, repeatPct, clientCount: uniqueClients.size };
});
