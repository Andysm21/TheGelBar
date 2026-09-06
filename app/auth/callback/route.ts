import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Google (and any other OAuth provider) redirects here with a `code`
// param after the user approves consent — Supabase's client-side
// signInWithOAuth() cannot exchange that itself for a session cookie,
// this server-side round trip is required. Without it, the browser
// just bounces back to the redirectTo URL with no session ever set,
// which looks like login silently failing.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = searchParams.get('locale') || 'en';
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/${locale}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=oauth`);
}
