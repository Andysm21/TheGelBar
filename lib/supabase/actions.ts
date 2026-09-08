'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from './server';
import { isFreeLoyaltySession, nextLoyaltyPoints } from '../services-catalog';
import {
  getMonthAvailability,
  getBookingsForDate,
  getAppSettings,
  getServiceCatalog,
  getAddons,
  getBookingById,
} from './cached-queries';
import { rateLimit } from '../rate-limit';
import { computeOpenStarts, toMinutes } from '../availability';
import { sendEmail, ownerAddress } from '../email/send';
import {
  notifyBookingRequested,
  notifyBookingConfirmed,
  notifyBookingDeclined,
  notifyBookingCancelled,
  notifyBookingRescheduled,
  notifyTierChanged,
} from '../email/notify';

async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'unknown';
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  return { supabase, user };
}

async function requireOwner() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'owner') throw new Error('Not an admin account.');
  return { supabase, user };
}

function revalidateBookingViews() {
  revalidatePath('/[locale]/admin/bookings', 'page');
  revalidatePath('/[locale]/admin/bookings/[id]', 'page');
  revalidatePath('/[locale]/admin/dashboard', 'page');
  revalidatePath('/[locale]/admin/calendar', 'page');
  revalidatePath('/[locale]/bookings', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
}

/* ================= auth ================= */

export async function adminSignIn(email: string, password: string) {
  const ip = await clientIp();
  const limit = rateLimit(`admin-login:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.ok) throw new Error(`Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.`);

  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(signInError.message);

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
  if (profile?.role !== 'owner') {
    await supabase.auth.signOut();
    throw new Error('This account is not an admin account.');
  }
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/* ================= read passthroughs (client components) ================= */

export async function fetchCatalog() {
  const [services, addons, settings] = await Promise.all([getServiceCatalog(), getAddons(), getAppSettings()]);
  return { services, addons, settings };
}

export async function fetchMonthAvailability(year: number, month: number) {
  return getMonthAvailability(year, month);
}

export async function fetchBookingsForDate(date: string) {
  await requireOwner();
  return getBookingsForDate(date);
}

/**
 * Bookable start times for one day and one duration — the single source
 * of truth used by the client booking flow AND both reschedule flows.
 */
export async function fetchOpenStarts(date: string, durationMinutes: number, excludeBookingId?: string) {
  const supabase = await createClient();
  const settings = await getAppSettings();

  const [ranges, blocked, bookings] = await Promise.all([
    supabase.from('availability_ranges').select('start_time, end_time').eq('date', date),
    supabase.from('blocked_days').select('date').eq('date', date),
    supabase
      .from('bookings')
      .select('id, scheduled_start, scheduled_end')
      .gte('scheduled_start', `${date}T00:00:00`)
      .lt('scheduled_start', `${date}T23:59:59`)
      .in('status', ['pending', 'confirmed', 'needs_reschedule']),
  ]);

  if (blocked.data && blocked.data.length > 0) return [];
  if (!ranges.data || ranges.data.length === 0) return [];

  const busy = (bookings.data ?? [])
    .filter((b: any) => b.id !== excludeBookingId)
    .map((b: any) => {
      const s = new Date(b.scheduled_start);
      const e = new Date(b.scheduled_end);
      return { startMin: s.getHours() * 60 + s.getMinutes(), endMin: e.getHours() * 60 + e.getMinutes() };
    });

  // Don't offer times already past for today.
  const today = new Date().toISOString().slice(0, 10);
  const minStart = date === today ? new Date().getHours() * 60 + new Date().getMinutes() : 0;

  return computeOpenStarts(ranges.data, busy, durationMinutes, settings.slot_step_minutes ?? 30, minStart);
}

/* ================= client booking ================= */

export interface CreateBookingInput {
  serviceId: string;
  variantId: string;
  addons: { addonId: string; quantity: number }[];
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  healthNotes: string;
  inspoPaths: string[];
}

export async function createBooking(input: CreateBookingInput) {
  const { supabase, user } = await requireUser();

  const limit = rateLimit(`create-booking:${user.id}`, 6, 10 * 60 * 1000);
  if (!limit.ok) throw new Error(`Too many booking attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.`);

  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_id', user.id)
    .in('status', ['pending', 'confirmed', 'needs_reschedule'])
    .limit(1);
  if (existing && existing.length > 0) {
    throw new Error('You already have an active booking. Cancel or finish it before booking another slot.');
  }

  // Price and duration always come from the DB, never from the client.
  const { data: variant, error: variantError } = await supabase
    .from('service_variants')
    .select('id, service_id, name_en, price_egp, duration_minutes, requires_inspo')
    .eq('id', input.variantId)
    .single();
  if (variantError || !variant) throw new Error('That service option is no longer available.');
  if (variant.service_id !== input.serviceId) throw new Error('Service and option do not match.');

  if (variant.requires_inspo && input.inspoPaths.length === 0) {
    throw new Error('Please upload at least one inspiration photo for this design.');
  }

  let totalPrice = variant.price_egp;
  let totalMinutes = variant.duration_minutes;
  const addonRows: { addon_id: string; quantity: number; unit_price_egp: number; unit_duration_minutes: number }[] = [];

  if (input.addons.length > 0) {
    const { data: addonDefs, error: addonError } = await supabase
      .from('addons')
      .select('id, price_egp, duration_minutes, is_quantity, max_quantity')
      .in(
        'id',
        input.addons.map((a) => a.addonId)
      );
    if (addonError) throw addonError;

    for (const picked of input.addons) {
      const def = (addonDefs ?? []).find((d: any) => d.id === picked.addonId);
      if (!def) continue;
      const qty = def.is_quantity ? Math.min(Math.max(1, picked.quantity), def.max_quantity) : 1;
      totalPrice += def.price_egp * qty;
      totalMinutes += def.duration_minutes * qty;
      addonRows.push({
        addon_id: def.id,
        quantity: qty,
        unit_price_egp: def.price_egp,
        unit_duration_minutes: def.duration_minutes,
      });
    }
  }

  // Re-check the slot server-side so two people can't grab the same time.
  const open = await fetchOpenStarts(input.date, totalMinutes);
  if (!open.includes(input.time)) {
    throw new Error('That time was just taken. Please pick another slot.');
  }

  const start = new Date(`${input.date}T${input.time}:00`);
  const end = new Date(start.getTime() + totalMinutes * 60_000);

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      client_id: user.id,
      service_id: input.serviceId,
      variant_id: variant.id,
      status: 'pending',
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      total_price_egp: totalPrice,
      total_minutes: totalMinutes,
      health_notes: input.healthNotes,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (addonRows.length > 0) {
    const { error: addonInsertError } = await supabase
      .from('booking_addons')
      .insert(addonRows.map((r) => ({ ...r, booking_id: booking.id })));
    if (addonInsertError) throw addonInsertError;
  }

  if (input.inspoPaths.length > 0) {
    const { error: imgError } = await supabase
      .from('booking_images')
      .insert(input.inspoPaths.map((p) => ({ booking_id: booking.id, storage_path: p })));
    if (imgError) throw imgError;
  }

  const settings = await getAppSettings();
  const full = await getBookingById(booking.id);
  await notifyBookingRequested(full, settings.owner_email);

  revalidateBookingViews();
  return booking;
}

export async function cancelBooking(bookingId: string) {
  const { supabase, user } = await requireUser();
  const booking = await getBookingById(bookingId);
  if (booking.client_id !== user.id) throw new Error('Not your booking.');

  const hoursUntil = (new Date(booking.scheduled_start).getTime() - Date.now()) / 3_600_000;
  if (hoursUntil <= 24) throw new Error('Too close to the appointment to cancel — contact the studio directly.');

  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  if (error) throw error;

  const settings = await getAppSettings();
  await notifyBookingCancelled(booking, settings.owner_email, 'client');
  revalidateBookingViews();
}

export async function requestReschedule(bookingId: string, newDate: string, newTime: string) {
  const { supabase, user } = await requireUser();
  const booking = await getBookingById(bookingId);
  if (booking.client_id !== user.id) throw new Error('Not your booking.');

  const hoursUntil = (new Date(booking.scheduled_start).getTime() - Date.now()) / 3_600_000;
  if (hoursUntil <= 24) throw new Error('Too close to the appointment to reschedule yourself — contact the studio.');

  const open = await fetchOpenStarts(newDate, booking.total_minutes, bookingId);
  if (!open.includes(newTime)) throw new Error('That time is no longer available. Pick another slot.');

  const newStart = new Date(`${newDate}T${newTime}:00`);
  const newEnd = new Date(newStart.getTime() + booking.total_minutes * 60_000);

  const { error } = await supabase
    .from('bookings')
    .update({ scheduled_start: newStart.toISOString(), scheduled_end: newEnd.toISOString(), status: 'pending' })
    .eq('id', bookingId);
  if (error) throw error;

  const settings = await getAppSettings();
  await notifyBookingRescheduled(await getBookingById(bookingId), settings.owner_email, 'client');
  revalidateBookingViews();
}

/* ================= owner: bookings ================= */

export async function setBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'declined' | 'needs_reschedule',
  reason?: string
) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
  if (error) throw error;

  const booking = await getBookingById(bookingId);
  const settings = await getAppSettings();
  if (status === 'confirmed') await notifyBookingConfirmed(booking);
  if (status === 'declined') await notifyBookingDeclined(booking, reason);
  if (status === 'needs_reschedule') await notifyBookingRescheduled(booking, settings.owner_email, 'owner');

  revalidateBookingViews();
}

export async function ownerCancelBooking(bookingId: string, reason?: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  if (error) throw error;

  await notifyBookingDeclined(await getBookingById(bookingId), reason);
  revalidateBookingViews();
}

export async function ownerReschedule(bookingId: string, newDate: string, newTime: string) {
  const { supabase } = await requireOwner();
  const booking = await getBookingById(bookingId);

  const open = await fetchOpenStarts(newDate, booking.total_minutes, bookingId);
  if (!open.includes(newTime)) throw new Error('That time is not available in the calendar.');

  const newStart = new Date(`${newDate}T${newTime}:00`);
  const newEnd = new Date(newStart.getTime() + booking.total_minutes * 60_000);

  const { error } = await supabase
    .from('bookings')
    .update({ scheduled_start: newStart.toISOString(), scheduled_end: newEnd.toISOString() })
    .eq('id', bookingId);
  if (error) throw error;

  const settings = await getAppSettings();
  await notifyBookingRescheduled(await getBookingById(bookingId), settings.owner_email, 'owner');
  revalidateBookingViews();
}

/**
 * Client picked "simple" but the design is actually "complex" (or the
 * reverse). Swaps the variant, recomputes price/duration from the DB,
 * and emails the client the new total.
 */
export async function changeBookingVariant(bookingId: string, newVariantId: string, note: string) {
  const { supabase } = await requireOwner();
  const booking = await getBookingById(bookingId);

  const { data: variant, error: variantError } = await supabase
    .from('service_variants')
    .select('id, service_id, name_en, price_egp, duration_minutes')
    .eq('id', newVariantId)
    .single();
  if (variantError || !variant) throw new Error('Unknown service option.');
  if (variant.service_id !== booking.service_id) throw new Error('That option belongs to a different service.');

  const addonPrice = (booking.booking_addons ?? []).reduce(
    (sum: number, a: any) => sum + a.unit_price_egp * a.quantity,
    0
  );
  const addonMinutes = (booking.booking_addons ?? []).reduce(
    (sum: number, a: any) => sum + a.unit_duration_minutes * a.quantity,
    0
  );

  const oldPrice = booking.total_price_egp;
  const newPrice = variant.price_egp + addonPrice;
  const newMinutes = variant.duration_minutes + addonMinutes;
  const newEnd = new Date(new Date(booking.scheduled_start).getTime() + newMinutes * 60_000);

  const { error } = await supabase
    .from('bookings')
    .update({
      variant_id: variant.id,
      total_price_egp: newPrice,
      total_minutes: newMinutes,
      scheduled_end: newEnd.toISOString(),
      tier_change_note: note,
      tier_changed_at: new Date().toISOString(),
    })
    .eq('id', bookingId);
  if (error) throw error;

  await notifyTierChanged(await getBookingById(bookingId), {
    fromVariant: booking.service_variants?.name_en ?? '',
    toVariant: variant.name_en,
    oldPrice,
    newPrice,
    note,
  });

  revalidateBookingViews();
}

export async function markBookingPaid(bookingId: string, wasCompleted: boolean) {
  const { supabase } = await requireOwner();
  const booking = await getBookingById(bookingId);

  const { data: profile } = await supabase
    .from('profiles')
    .select('loyalty_points')
    .eq('id', booking.client_id)
    .single();

  const settings = await getAppSettings();
  const points = profile?.loyalty_points ?? 0;
  const isFree = settings.loyalty_enabled && isFreeLoyaltySession(points);
  const finalPrice = isFree ? 0 : wasCompleted ? booking.total_price_egp : 0;

  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'done',
      was_service_completed: wasCompleted,
      total_price_egp: finalPrice,
      is_loyalty_free: isFree,
    })
    .eq('id', bookingId);
  if (error) throw error;

  if (settings.loyalty_enabled) {
    await supabase.from('profiles').update({ loyalty_points: nextLoyaltyPoints(points) }).eq('id', booking.client_id);
  }

  revalidateBookingViews();
  revalidatePath('/[locale]/admin/clients', 'page');
}

/* ================= owner: availability ranges ================= */

export async function addAvailabilityRange(date: string, startTime: string, endTime: string) {
  const { supabase } = await requireOwner();
  if (toMinutes(endTime) <= toMinutes(startTime)) throw new Error('End time must be after the start time.');

  const { error } = await supabase
    .from('availability_ranges')
    .upsert({ date, start_time: startTime, end_time: endTime }, { onConflict: 'date,start_time,end_time' });
  if (error) throw error;
  revalidatePath('/[locale]/admin/calendar', 'page');
}

export async function removeAvailabilityRange(rangeId: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from('availability_ranges').delete().eq('id', rangeId);
  if (error) throw error;
  revalidatePath('/[locale]/admin/calendar', 'page');
}

export async function setDayBlocked(date: string, blocked: boolean) {
  const { supabase } = await requireOwner();
  if (blocked) {
    const { error } = await supabase.from('blocked_days').upsert({ date }, { onConflict: 'date' });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('blocked_days').delete().eq('date', date);
    if (error) throw error;
  }
  revalidatePath('/[locale]/admin/calendar', 'page');
}

/** Apply the same range to a set of dates at once. */
export async function bulkAddRanges(dates: string[], startTime: string, endTime: string) {
  const { supabase } = await requireOwner();
  if (toMinutes(endTime) <= toMinutes(startTime)) throw new Error('End time must be after the start time.');
  const rows = dates.map((date) => ({ date, start_time: startTime, end_time: endTime }));
  const { error } = await supabase.from('availability_ranges').upsert(rows, { onConflict: 'date,start_time,end_time' });
  if (error) throw error;
  revalidatePath('/[locale]/admin/calendar', 'page');
}

/* ================= owner: catalog editing ================= */

export async function updateService(
  id: string,
  fields: { name_en?: string; name_ar?: string; description_en?: string; description_ar?: string; is_active?: boolean }
) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from('services').update(fields).eq('id', id);
  if (error) throw error;
  revalidateTag('catalog', 'max');
  revalidatePath('/[locale]/admin/services', 'page');
  revalidatePath('/[locale]/services', 'page');
}

export async function updateVariant(
  id: string,
  fields: { name_en?: string; name_ar?: string; price_egp?: number; duration_minutes?: number; requires_inspo?: boolean; is_active?: boolean }
) {
  const { supabase } = await requireOwner();
  if (fields.price_egp !== undefined && (!Number.isFinite(fields.price_egp) || fields.price_egp < 0)) {
    throw new Error('Price must be 0 or more.');
  }
  if (fields.duration_minutes !== undefined && (!Number.isFinite(fields.duration_minutes) || fields.duration_minutes < 5)) {
    throw new Error('Duration must be at least 5 minutes.');
  }
  const { error } = await supabase.from('service_variants').update(fields).eq('id', id);
  if (error) throw error;
  revalidateTag('catalog', 'max');
  revalidatePath('/[locale]/admin/services', 'page');
  revalidatePath('/[locale]/services', 'page');
}

export async function updateAddon(
  id: string,
  fields: { name_en?: string; name_ar?: string; price_egp?: number; duration_minutes?: number; max_quantity?: number; is_active?: boolean }
) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from('addons').update(fields).eq('id', id);
  if (error) throw error;
  revalidateTag('catalog', 'max');
  revalidatePath('/[locale]/admin/services', 'page');
}

export async function updateClientNotes(clientId: string, adminPrivateNotes: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from('profiles').update({ admin_private_notes: adminPrivateNotes }).eq('id', clientId);
  if (error) throw error;
  revalidatePath('/[locale]/admin/clients', 'page');
}

export async function setLoyaltyEnabled(enabled: boolean) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from('app_settings').update({ loyalty_enabled: enabled }).eq('id', 1);
  if (error) throw error;
  revalidateTag('app-settings', 'minutes');
  revalidatePath('/[locale]/admin/services', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
}

export async function updateSettings(fields: { slot_step_minutes?: number; owner_email?: string }) {
  const { supabase } = await requireOwner();
  if (fields.slot_step_minutes !== undefined && ![15, 30, 60].includes(fields.slot_step_minutes)) {
    throw new Error('Slot step must be 15, 30 or 60 minutes.');
  }
  const { error } = await supabase.from('app_settings').update(fields).eq('id', 1);
  if (error) throw error;
  revalidateTag('app-settings', 'minutes');
  revalidatePath('/[locale]/admin/services', 'page');
}

export async function refreshCatalogCache() {
  await requireOwner();
  revalidateTag('catalog', 'max');
  revalidateTag('app-settings', 'minutes');
  revalidatePath('/[locale]/admin/services', 'page');
  revalidatePath('/[locale]/services', 'page');
  revalidatePath('/[locale]/book', 'page');
}

/** Sends a real email to the owner address so delivery can be verified. */
export async function sendTestEmail() {
  await requireOwner();
  const to = ownerAddress();
  const res = await sendEmail({
    to,
    subject: 'The Gel Bar — test email',
    html: `<!doctype html><html><body style="margin:0;background:#f1b7cd;padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff1f6;border:1px solid #dfa9c0;">
          <tr><td style="background:#3e1427;padding:28px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:24px;color:#fff;">The Gel Bar</div>
          </td></tr>
          <tr><td style="padding:32px;font-family:Georgia,serif;font-size:15px;line-height:1.7;color:#3e1427;">
            Email delivery is working. Booking, confirmation, reschedule, cancellation and price-change
            emails will all be sent from this address.
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`,
  });

  if (res.skipped) throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD are not set in the environment.');
  if (!res.ok) throw new Error('Gmail rejected the message — check the app password.');
  return { ok: true, to };
}
