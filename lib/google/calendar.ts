import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from '@/lib/email/send';
import { cleanEnv } from '@/lib/env';

/**
 * Pushes bookings into the owner's Google Calendar.
 *
 * Mariam uses Apple Calendar; she adds her Google account to her iPhone once
 * and these events show up there natively. Apple has no public write API for
 * personal calendars, so Google is the practical backend.
 *
 * Plain fetch against Google's REST endpoints — the official client library
 * is tens of megabytes for three calls.
 *
 * Everything here is fail-soft. Not configured, not connected, token revoked,
 * Google down: the booking itself must still succeed, so every public
 * function catches and logs instead of throwing.
 *
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (the same OAuth client used for
 * Google sign-in works, once the Calendar API and redirect URI are added).
 */

const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events'];

export function googleConfigured() {
  return Boolean(cleanEnv('GOOGLE_CLIENT_ID') && cleanEnv('GOOGLE_CLIENT_SECRET'));
}

export function redirectUri() {
  return `${siteUrl()}/api/google/callback`;
}

export function authUrl(state: string) {
  const params = new URLSearchParams({
    client_id: cleanEnv('GOOGLE_CLIENT_ID')!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    // offline + consent is what makes Google hand back a refresh token
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cleanEnv('GOOGLE_CLIENT_ID')!,
      client_secret: cleanEnv('GOOGLE_CLIENT_SECRET')!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || 'Google token exchange failed');

  let email: string | null = null;
  try {
    const me = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${json.access_token}` },
    });
    if (me.ok) email = (await me.json()).email ?? null;
  } catch {
    /* the email is only for display */
  }

  return { refreshToken: json.refresh_token as string | undefined, email };
}

async function accessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cleanEnv('GOOGLE_CLIENT_ID')!,
      client_secret: cleanEnv('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google refresh failed: ${json.error || res.status}`);
  return json.access_token as string;
}

const LIVE_STATUSES = new Set(['pending', 'confirmed']);

export type SyncResult =
  | { ok: true; action: 'created' | 'updated' | 'deleted' | 'unchanged' | 'skipped' }
  | { ok: false; reason: string };

/**
 * Bring Google in line with a booking's current state: create or update the
 * event while it is pending/confirmed, delete it once it is cancelled,
 * declined or waiting on a new time. Completed bookings are left alone so
 * her calendar keeps a history.
 *
 * Never throws, so a Google or database problem can't break a booking. It
 * also never hides one: every failure is logged with its cause and returned
 * as `{ ok: false, reason }`. (An earlier version ignored the `error` half of
 * each query, so a database permission problem looked like "nothing to do" and
 * left no trace anywhere.)
 */
export async function syncBookingToGoogle(bookingId: string): Promise<SyncResult> {
  const fail = (reason: string, detail?: unknown): SyncResult => {
    console.error(`[google] sync failed for booking ${bookingId}: ${reason}`, detail ?? '');
    return { ok: false, reason };
  };

  try {
    if (!googleConfigured()) return { ok: true, action: 'skipped' };
    const admin = createAdminClient();
    if (!admin) return fail('SUPABASE_SERVICE_ROLE_KEY is not set on the server');

    const { data: conn, error: connError } = await admin
      .from('google_calendar')
      .select('refresh_token, calendar_id')
      .eq('id', 1)
      .maybeSingle();
    if (connError) return fail(`could not read the calendar connection (${connError.message})`, connError);
    // Not connected is a normal state, not a failure.
    if (!conn) return { ok: true, action: 'skipped' };

    const { data: b, error: bookingError } = await admin
      .from('bookings')
      .select(
        `id, status, scheduled_start, scheduled_end, total_price_egp, health_notes, google_event_id, variant_quantity,
         services ( name_en ), service_variants ( name_en ), profiles ( name, email )`
      )
      .eq('id', bookingId)
      .maybeSingle();
    if (bookingError) return fail(`could not read the booking (${bookingError.message})`, bookingError);
    if (!b) return fail('booking not found');
    if (b.status === 'done') return { ok: true, action: 'skipped' };

    const token = await accessToken(conn.refresh_token);
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`;
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const saveEventId = async (id: string | null) => {
      const { error } = await admin.from('bookings').update({ google_event_id: id }).eq('id', b.id);
      return error;
    };

    if (!LIVE_STATUSES.has(b.status)) {
      if (!b.google_event_id) return { ok: true, action: 'unchanged' };
      const res = await fetch(`${base}/${b.google_event_id}`, { method: 'DELETE', headers: auth });
      // 404/410: already gone, which is the state we wanted
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        return fail(`Google refused to delete the event (HTTP ${res.status})`, await res.text());
      }
      const err = await saveEventId(null);
      if (err) return fail(`deleted in Google but could not clear the link (${err.message})`, err);
      return { ok: true, action: 'deleted' };
    }

    const s = b as any;
    const qty = (s.variant_quantity ?? 1) > 1 ? ` ×${s.variant_quantity}` : '';
    const pending = b.status === 'pending';
    const event = {
      summary: `${pending ? '[Pending] ' : ''}${s.profiles?.name ?? 'Client'} — ${s.services?.name_en ?? 'Booking'}`,
      description: [
        `${s.services?.name_en ?? ''} · ${s.service_variants?.name_en ?? ''}${qty}`,
        `${b.total_price_egp} EGP`,
        ...(s.profiles?.email ? [`Client: ${s.profiles.email}`] : []),
        ...(b.health_notes ? [`Notes: ${b.health_notes}`] : []),
        '',
        `${siteUrl()}/en/admin/bookings/${b.id}`,
      ].join('\n'),
      start: { dateTime: b.scheduled_start, timeZone: 'Africa/Cairo' },
      end: { dateTime: b.scheduled_end, timeZone: 'Africa/Cairo' },
      // pending shows as tentative/striped, so she can tell them apart at a glance
      status: pending ? 'tentative' : 'confirmed',
      colorId: pending ? '5' : '3',
    };

    if (b.google_event_id) {
      const res = await fetch(`${base}/${b.google_event_id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(event) });
      if (res.ok) return { ok: true, action: 'updated' };
      // Deleted by hand in Google? Fall through and create it again.
      if (res.status !== 404 && res.status !== 410) {
        return fail(`Google refused the update (HTTP ${res.status})`, await res.text());
      }
    }

    const res = await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(event) });
    if (!res.ok) return fail(`Google refused the new event (HTTP ${res.status})`, await res.text());
    const created = await res.json();
    const err = await saveEventId(created.id);
    if (err) return fail(`created in Google but could not save the link (${err.message})`, err);
    return { ok: true, action: 'created' };
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'unexpected error', err);
  }
}
