import { sendEmail, siteUrl, ownerAddress } from './send';
import * as tpl from './templates';
import type { BookingEmailData } from './templates';

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
    variantName: b.service_variants?.name_en || '',
    addons: (b.booking_addons ?? []).map((a) => ({
      name: a.addons?.name_en || 'Add-on',
      quantity: a.quantity,
      price: a.unit_price_egp,
    })),
    dateLabel: start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    timeLabel: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    durationLabel: formatDuration(b.total_minutes ?? 0),
    totalPrice: b.total_price_egp,
    notes: b.health_notes || undefined,
    bookingRef: b.id.slice(0, 8),
    inspoCount: (b.booking_images ?? []).length,
    siteUrl: siteUrl(),
  };
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
  await sendEmail({ to: d.clientEmail, ...tpl.clientBookingConfirmed(d) });
}

export async function notifyBookingDeclined(b: BookingRecord, reason?: string) {
  const d = toEmailData(b);
  await sendEmail({ to: d.clientEmail, ...tpl.clientBookingDeclined(d, reason) });
}

export async function notifyBookingCancelled(b: BookingRecord, ownerEmail: string | undefined, by: 'client' | 'owner') {
  const d = toEmailData(b);
  const jobs = [sendEmail({ to: d.clientEmail, ...tpl.clientBookingCancelled(d) })];
  if (by === 'client') jobs.push(sendEmail({ to: ownerEmail || ownerAddress(), ...tpl.ownerBookingCancelled(d) }));
  await Promise.allSettled(jobs);
}

export async function notifyBookingRescheduled(b: BookingRecord, ownerEmail: string | undefined, by: 'client' | 'owner') {
  const d = toEmailData(b);
  const jobs = [sendEmail({ to: d.clientEmail, ...tpl.clientBookingRescheduled(d, by) })];
  if (by === 'client') jobs.push(sendEmail({ to: ownerEmail || ownerAddress(), ...tpl.ownerBookingRescheduled(d) }));
  await Promise.allSettled(jobs);
}

export async function notifyTierChanged(
  b: BookingRecord,
  change: { fromVariant: string; toVariant: string; oldPrice: number; newPrice: number; note: string }
) {
  const d = toEmailData(b);
  await sendEmail({ to: d.clientEmail, ...tpl.clientTierChanged(d, change) });
}
