import { sendEmail, siteUrl, ownerAddress } from './send';
import * as tpl from './templates';
import type { BookingEmailData } from './templates';
import { buildIcs } from './ics';

/** Shape returned by the booking-with-relations query in cached-queries. */
export interface BookingRecord {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  total_price_egp: number;
  total_minutes: number;
  health_notes?: string | null;
  profiles?: { name?: string | null; email?: string | null } | null;
  services?: { name_en?: string | null } | null;
  service_variants?: { name_en?: string | null } | null;
  variant_quantity?: number | null;
  booking_addons?: { quantity: number; unit_price_egp: number; addons?: { name_en?: string | null } | null }[] | null;
  booking_images?: { id: string }[] | null;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function toEmailData(b: BookingRecord): BookingEmailData & { clientEmail: string; inspoCount: number } {
  const start = new Date(b.scheduled_start);
  return {
    clientName: b.profiles?.name?.split(' ')[0] || 'there',
    clientEmail: b.profiles?.email || '',
    serviceName: b.services?.name_en || 'Service',
    variantName:
      (b.service_variants?.name_en || '') +
      ((b.variant_quantity ?? 1) > 1 ? ` ×${b.variant_quantity}` : ''),
    addons: (b.booking_addons ?? []).map((a) => ({
      name: a.addons?.name_en || 'Add-on',
      quantity: a.quantity,
      price: a.unit_price_egp,
    })),
    dateLabel: start.toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    timeLabel: start.toLocaleTimeString('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }),
    durationLabel: formatDuration(b.total_minutes ?? 0),
    totalPrice: b.total_price_egp,
    notes: b.health_notes || undefined,
    bookingRef: b.id.slice(0, 8),
    inspoCount: (b.booking_images ?? []).length,
    siteUrl: siteUrl(),
  };
}

/**
 * Calendar file for a booking. The UID is the booking id, so a reschedule
 * replaces the event in the client's calendar instead of adding a second one;
 * the sequence only has to increase, and the clock always does.
 */
function icsFor(b: BookingRecord, method: 'REQUEST' | 'CANCEL' = 'REQUEST') {
  const d = toEmailData(b);
  return buildIcs({
    uid: b.id,
    start: new Date(b.scheduled_start),
    end: new Date(b.scheduled_end),
    summary: `The Gel Bar — ${d.serviceName}${d.variantName ? ` (${d.variantName})` : ''}`,
    description: `Booking ref ${d.bookingRef}. Manage it at ${d.siteUrl}/en/bookings`,
    sequence: Math.floor(Date.now() / 1000),
    method,
  });
}

/* ---------------- dispatchers ---------------- */

export async function notifyBookingRequested(b: BookingRecord, ownerEmail?: string) {
  const owner = ownerEmail || ownerAddress();
  const d = toEmailData(b);
  const client = tpl.clientBookingRequested(d);
  const ownerMsg = tpl.ownerNewBooking(d);
  await Promise.allSettled([
    sendEmail({ to: d.clientEmail, ...client }),
    sendEmail({ to: owner, ...ownerMsg, replyTo: d.clientEmail || undefined }),
  ]);
}

export async function notifyBookingConfirmed(b: BookingRecord) {
  const d = toEmailData(b);
  await sendEmail({ to: d.clientEmail, ...tpl.clientBookingConfirmed(d), ics: icsFor(b) });
}

export async function notifyBookingDeclined(b: BookingRecord, reason?: string) {
  const d = toEmailData(b);
  await sendEmail({ to: d.clientEmail, ...tpl.clientBookingDeclined(d, reason) });
}

export async function notifyBookingCancelled(b: BookingRecord, ownerEmail: string | undefined, by: 'client' | 'owner') {
  const d = toEmailData(b);
  const jobs = [sendEmail({ to: d.clientEmail, ...tpl.clientBookingCancelled(d), ics: icsFor(b, 'CANCEL') })];
  if (by === 'client') jobs.push(sendEmail({ to: ownerEmail || ownerAddress(), ...tpl.ownerBookingCancelled(d) }));
  await Promise.allSettled(jobs);
}

export async function notifyBookingRescheduled(b: BookingRecord, ownerEmail: string | undefined, by: 'client' | 'owner') {
  const d = toEmailData(b);
  // An owner-proposed reschedule has no new time yet, so only attach a
  // calendar file when the booking actually moved.
  const moved = by === 'client' || (b as { status?: string }).status !== 'needs_reschedule';
  const jobs = [
    sendEmail({ to: d.clientEmail, ...tpl.clientBookingRescheduled(d, by), ics: moved ? icsFor(b) : undefined }),
  ];
  if (by === 'client') jobs.push(sendEmail({ to: ownerEmail || ownerAddress(), ...tpl.ownerBookingRescheduled(d) }));
  await Promise.allSettled(jobs);
}

export async function notifyBookingReminder(b: BookingRecord) {
  const d = toEmailData(b);
  return sendEmail({ to: d.clientEmail, ...tpl.clientBookingReminder(d), ics: icsFor(b) });
}

export async function notifyTierChanged(
  b: BookingRecord,
  change: { fromVariant: string; toVariant: string; oldPrice: number; newPrice: number; note: string }
) {
  const d = toEmailData(b);
  await sendEmail({ to: d.clientEmail, ...tpl.clientTierChanged(d, change) });
}
