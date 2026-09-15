import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from '@/lib/email/send';

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
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri() {
  return `${siteUrl()}/api/google/callback`;
}

export function authUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
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
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
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
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google refresh failed: ${json.error || res.status}`);
  return json.access_token as string;
}

const LIVE_STATUSES = new Set(['pending', 'confirmed']);

/**
 * Bring Google in line with a booking's current state: create or update the
 * event while it is pending/confirmed, delete it once it is cancelled,
 * declined or waiting on a new time. Completed bookings are left alone so
 * her calendar keeps a history.
 */
export async function syncBookingToGoogle(bookingId: string) {
  try {
    if (!googleConfigured()) return;
    const admin = createAdminClient();
    if (!admin) return;

    const { data: conn } = await admin.from('google_calendar').select('refresh_token, calendar_id').eq('id', 1).maybeSingle();
    if (!conn) return;

    const { data: b } = await admin
      .from('bookings')
      .select(
        `id, status, scheduled_start, scheduled_end, total_price_egp, health_notes, google_event_id, variant_quantity,
         services ( name_en ), service_variants ( name_en ), profiles ( name, email )`
      )
      .eq('id', bookingId)
      .maybeSingle();
    if (!b) return;
    if (b.status === 'done') return;

    const token = await accessToken(conn.refresh_token);
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(conn.calendar_id)}/events`;
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    if (!LIVE_STATUSES.has(b.status)) {
      if (b.google_event_id) {
        const res = await fetch(`${base}/${b.google_event_id}`, { method: 'DELETE', headers: auth });
        // 404/410: already gone, which is the state we wanted
        if (res.ok || res.status === 404 || res.status === 410) {
          await admin.from('bookings').update({ google_event_id: null }).eq('id', b.id);
        }
      }
      return;
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
      if (res.ok) return;
      // Deleted by hand in Google? Fall through and create it again.
      if (res.status !== 404 && res.status !== 410) {
        console.error('[google] update failed', res.status, await res.text());
        return;
      }
    }

    const res = await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(event) });
    if (!res.ok) {
      console.error('[google] create failed', res.status, await res.text());
      return;
    }
    const created = await res.json();
    await admin.from('bookings').update({ google_event_id: created.id }).eq('id', b.id);
  } catch (err) {
    console.error('[google] sync failed for booking', bookingId, err);
  }
}
