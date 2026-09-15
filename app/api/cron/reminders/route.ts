import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BOOKING_SELECT } from '@/lib/supabase/cached-queries';
import { notifyBookingReminder } from '@/lib/email/notify';
import { cairoDate, cairoDayBounds } from '@/lib/time';

/**
 * Daily reminder run: emails every confirmed client whose appointment is
 * tomorrow (Cairo), with the calendar file attached.
 *
 * Triggered by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET` on its own when that env var is set;
 * anything without it is refused, so the endpoint can't be used to spam
 * clients.
 *
 * Idempotent: each booking is claimed by stamping reminder_sent_at *before*
 * sending, conditional on it still being empty, so an overlapping or
 * repeated run can never send the same reminder twice.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 });
  }

  // "Tomorrow" on the studio's calendar, not the server's.
  const today = cairoDate(new Date());
  const [y, m, d] = today.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  const day = cairoDayBounds(tomorrow);

  const { data: due, error } = await supabase
    .from('bookings')
    .select(`${BOOKING_SELECT}, profiles ( name, email )`)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('scheduled_start', day.startIso)
    .lt('scheduled_start', day.endIso);

  if (error) {
    console.error('[reminders] query failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const booking of due ?? []) {
    const { data: claimed } = await supabase
      .from('bookings')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', booking.id)
      .is('reminder_sent_at', null)
      .select('id');
    if (!claimed || claimed.length === 0) continue; // another run got it

    const result = await notifyBookingReminder(booking as any);
    if (result.ok) {
      sent++;
    } else {
      failed++;
      // Release the claim so a manual re-run can try again.
      await supabase.from('bookings').update({ reminder_sent_at: null }).eq('id', booking.id);
    }
  }

  return NextResponse.json({ date: tomorrow, due: due?.length ?? 0, sent, failed });
}
