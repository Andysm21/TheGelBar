'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from './server';
import { getService, getDesignOption, isFreeLoyaltySession, nextLoyaltyPoints } from '../services-catalog';
import { getMonthAvailability, getOpenTimesForDate, getBookingsForDate } from './cached-queries';

// ---------- Read passthroughs ----------
// Client components (the booking wizard) can't import cached-queries.ts
// directly — it pulls in next/headers, which is server-only. Server
// Actions are callable from client components though, so these thin
// wrappers are the bridge.

export async function fetchMonthAvailability(year: number, month: number) {
  return getMonthAvailability(year, month);
}

export async function fetchOpenTimesForDate(date: string) {
  return getOpenTimesForDate(date);
}

export async function fetchBookingsForDate(date: string) {
  await requireOwner();
  return getBookingsForDate(date);
}

async function requireUser() {
  const supabase = createClient();
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

// ---------- Client actions ----------

export async function createBooking(input: {
  serviceId: string;
  designId: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  healthNotes: string;
}) {
  const { supabase, user } = await requireUser();

  const service = getService(input.serviceId);
  if (!service) throw new Error('Unknown service.');
  const design = input.designId ? getDesignOption(input.designId) : undefined;

  const start = new Date(`${input.date}T${input.time}:00`);
  const end = new Date(start.getTime() + service.baseMinutes * 60_000);
  const totalPriceEgp = service.basePriceEgp + (design?.priceEgp ?? 0);

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      client_id: user.id,
      service_id: input.serviceId,
      design_id: input.designId,
      status: 'pending',
      scheduled_start: start.toISOString(),
      scheduled_end: end.toISOString(),
      total_price_egp: totalPriceEgp,
      health_notes: input.healthNotes,
    })
    .select('id')
    .single();

  if (error) throw error;

  // TODO(deferred, see plan doc): generate .ics + tentative Google
  // Calendar event here once email/calendar sync is built.
  revalidatePath('/[locale]/admin/bookings', 'page');
  revalidatePath('/[locale]/admin/dashboard', 'page');
  return data;
}

export async function cancelBooking(bookingId: string) {
  const { supabase, user } = await requireUser();
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('scheduled_start, client_id')
    .eq('id', bookingId)
    .single();
  if (fetchError) throw fetchError;
  if (booking.client_id !== user.id) throw new Error('Not your booking.');

  const hoursUntil = (new Date(booking.scheduled_start).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil <= 24) throw new Error('Too close to the appointment to cancel — contact the salon directly.');

  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  if (error) throw error;
  revalidatePath('/[locale]/bookings', 'page');
}

export async function requestReschedule(bookingId: string, newDate: string, newTime: string) {
  const { supabase, user } = await requireUser();
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('scheduled_start, scheduled_end, client_id, service_id')
    .eq('id', bookingId)
    .single();
  if (fetchError) throw fetchError;
  if (booking.client_id !== user.id) throw new Error('Not your booking.');

  const hoursUntil = (new Date(booking.scheduled_start).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil <= 24) throw new Error('Too close to the appointment to reschedule yourself — contact the salon directly.');

  const durationMs = new Date(booking.scheduled_end).getTime() - new Date(booking.scheduled_start).getTime();
  const newStart = new Date(`${newDate}T${newTime}:00`);
  const newEnd = new Date(newStart.getTime() + durationMs);

  const { error } = await supabase
    .from('bookings')
    .update({ scheduled_start: newStart.toISOString(), scheduled_end: newEnd.toISOString(), status: 'pending' })
    .eq('id', bookingId);
  if (error) throw error;
  revalidatePath('/[locale]/bookings', 'page');
}

// ---------- Owner actions ----------

export async function setBookingStatus(bookingId: string, status: 'confirmed' | 'declined' | 'needs_reschedule') {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
  if (error) throw error;
  revalidatePath('/[locale]/admin/bookings', 'page');
  revalidatePath('/[locale]/admin/bookings/[id]', 'page');
  revalidatePath('/[locale]/admin/dashboard', 'page');
}

export async function ownerReschedule(bookingId: string, newDate: string, newTime: string) {
  await requireOwner();
  const supabase = createClient();
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('scheduled_start, scheduled_end')
    .eq('id', bookingId)
    .single();
  if (fetchError) throw fetchError;

  const durationMs = new Date(booking.scheduled_end).getTime() - new Date(booking.scheduled_start).getTime();
  const newStart = new Date(`${newDate}T${newTime}:00`);
  const newEnd = new Date(newStart.getTime() + durationMs);

  const { error } = await supabase
    .from('bookings')
    .update({ scheduled_start: newStart.toISOString(), scheduled_end: newEnd.toISOString(), status: 'needs_reschedule' })
    .eq('id', bookingId);
  if (error) throw error;
  revalidatePath('/[locale]/admin/bookings/[id]', 'page');
}

/**
 * Close out a session: mark which parts were actually done, compute the
 * final price (applying the free-11th-session rule), mark paid, and
 * credit/reset loyalty points — all in one action so the price shown and
 * the price stored can never drift apart.
 */
export async function markBookingPaid(bookingId: string, wasServiceCompleted: boolean, wasDesignCompleted: boolean) {
  const { supabase } = await requireOwner();

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('client_id, service_id, design_id')
    .eq('id', bookingId)
    .single();
  if (fetchError) throw fetchError;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('loyalty_points')
    .eq('id', booking.client_id)
    .single();
  if (profileError) throw profileError;

  const service = getService(booking.service_id);
  const design = booking.design_id ? getDesignOption(booking.design_id) : undefined;
  const isFree = isFreeLoyaltySession(profile.loyalty_points);
  const rawPrice = (wasServiceCompleted ? service?.basePriceEgp ?? 0 : 0) + (wasDesignCompleted && design ? design.priceEgp : 0);
  const finalPrice = isFree ? 0 : rawPrice;

  const { error: bookingUpdateError } = await supabase
    .from('bookings')
    .update({
      status: 'done',
      was_service_completed: wasServiceCompleted,
      was_design_completed: wasDesignCompleted,
      total_price_egp: finalPrice,
      is_loyalty_free: isFree,
    })
    .eq('id', bookingId);
  if (bookingUpdateError) throw bookingUpdateError;

  const { error: loyaltyError } = await supabase
    .from('profiles')
    .update({ loyalty_points: nextLoyaltyPoints(profile.loyalty_points) })
    .eq('id', booking.client_id);
  if (loyaltyError) throw loyaltyError;

  revalidatePath('/[locale]/admin/bookings/[id]', 'page');
  revalidatePath('/[locale]/admin/clients', 'page');
}

export async function addAvailabilitySlot(date: string, startTime: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from('availability_slots').upsert(
    { date, start_time: startTime, is_blocked: false },
    { onConflict: 'date,start_time' }
  );
  if (error) throw error;
  revalidatePath('/[locale]/admin/calendar', 'page');
}

export async function removeAvailabilitySlot(date: string, startTime: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from('availability_slots').delete().eq('date', date).eq('start_time', startTime);
  if (error) throw error;
  revalidatePath('/[locale]/admin/calendar', 'page');
}

export async function setDayBlocked(date: string, blocked: boolean) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from('availability_slots').update({ is_blocked: blocked }).eq('date', date);
  if (error) throw error;
  revalidatePath('/[locale]/admin/calendar', 'page');
}

export async function updateClientNotes(clientId: string, adminPrivateNotes: string) {
  await requireOwner();
  const supabase = createClient();
  const { error } = await supabase.from('profiles').update({ admin_private_notes: adminPrivateNotes }).eq('id', clientId);
  if (error) throw error;
  revalidatePath('/[locale]/admin/clients', 'page');
}
