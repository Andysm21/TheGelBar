import { NextResponse, type NextRequest } from 'next/server';
import { exchangeCode } from '@/lib/google/calendar';
import { siteUrl } from '@/lib/email/send';
import { ownerSession } from '../_owner';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const back = (result: string) => {
    const res = NextResponse.redirect(`${siteUrl()}/en/admin/dashboard?google=${result}`);
    res.cookies.delete({ name: 'google_oauth_state', path: '/api/google' });
    return res;
  };

  const params = request.nextUrl.searchParams;
  if (params.get('error')) return back('denied');

  const state = params.get('state');
  const expected = request.cookies.get('google_oauth_state')?.value;
  if (!state || !expected || state !== expected) return back('expired');

  const supabase = await ownerSession();
  if (!supabase) return NextResponse.redirect(`${siteUrl()}/en/admin/login`);

  const code = params.get('code');
  if (!code) return back('failed');

  try {
    const { refreshToken, email } = await exchangeCode(code);
    // No refresh token means we could never act on her behalf later.
    if (!refreshToken) return back('no-refresh-token');

    const { error } = await supabase.from('google_calendar').upsert({
      id: 1,
      refresh_token: refreshToken,
      google_email: email,
      calendar_id: 'primary',
      connected_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[google] saving connection failed', error);
      return back('failed');
    }
    return back('connected');
  } catch (err) {
    console.error('[google] callback failed', err);
    return back('failed');
  }
}
