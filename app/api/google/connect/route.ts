import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { authUrl, googleConfigured } from '@/lib/google/calendar';
import { siteUrl } from '@/lib/email/send';
import { ownerSession } from '../_owner';

export const dynamic = 'force-dynamic';

/** Owner clicks "Connect Google Calendar" → off to Google's consent screen. */
export async function GET() {
  const back = `${siteUrl()}/en/admin/dashboard`;
  if (!(await ownerSession())) return NextResponse.redirect(`${siteUrl()}/en/admin/login`);
  if (!googleConfigured()) return NextResponse.redirect(`${back}?google=not-configured`);

  // CSRF guard: the callback only accepts the state we just set.
  const state = randomBytes(24).toString('hex');
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/google',
    maxAge: 600,
  });
  return res;
}
