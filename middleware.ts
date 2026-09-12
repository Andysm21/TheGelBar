import createMiddleware from 'next-intl/middleware';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales } from './i18n';
import {
  LAST_SEEN_COOKIE,
  TIMEOUT_PARAM,
  isAbsoluteExpired,
  isIdleExpired,
} from './lib/auth/session-policy';

type CookieToSet = { name: string; value: string; options?: CookieOptionsWithName };

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
});

// Matches /en/admin/... or /ar/admin/... but not /admin/login itself.
const ADMIN_PATH = /^\/(en|ar)\/admin(?!\/login)(\/.*)?$/;
// The two sign-in screens: never redirect these to themselves.
const LOGIN_PATH = /^\/(en|ar)\/(admin\/)?login\/?$/;

/**
 * Forget the session by dropping Supabase's own auth cookies. Cheaper and
 * more reliable here than calling signOut(), which would need a network
 * round trip and its own response to write cookies into.
 */
function clearAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) {
      response.cookies.delete(cookie.name);
    }
  }
  response.cookies.delete(LAST_SEEN_COOKIE);
}

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const path = request.nextUrl.pathname;
  const isAdminPath = ADMIN_PATH.test(path);

  // Without a live Supabase project (mock-data phase, see DEPLOY.md) this
  // check can't run — fail closed with a clear message rather than either
  // silently allowing everyone in or crashing on missing env vars.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (!isAdminPath) return response;
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Admin area unavailable: Supabase is not configured yet.', { status: 503 });
    }
    // Dev/mock mode: let it through so the mock-data admin pages remain
    // browsable while building, but this branch never runs once
    // .env.local is filled in — see DEPLOY.md §1b.
    return response;
  }

  const locale = locales.includes(path.split('/')[1] as never) ? path.split('/')[1] : 'en';

  // Must build the Supabase cookie handler on top of `response` (the
  // next-intl-processed response), not a fresh NextResponse.next() — a
  // fresh one drops next-intl's internal locale rewrite headers, which
  // 404'd every gated /admin/* route while /admin/login (not routed
  // through this branch) kept working fine.
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: CookieToSet[]) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ---------- session expiry (applies to clients and the owner) ---------- */

  if (user && !LOGIN_PATH.test(path)) {
    const now = Date.now();
    const lastSeen = Number(request.cookies.get(LAST_SEEN_COOKIE)?.value ?? 0);
    const signedInAt = Date.parse(user.last_sign_in_at ?? '') || 0;

    if (isIdleExpired(lastSeen, now) || isAbsoluteExpired(signedInAt, now)) {
      const loginUrl = new URL(isAdminPath ? `/${locale}/admin/login` : `/${locale}/login`, request.url);
      loginUrl.searchParams.set(TIMEOUT_PARAM, '1');
      const timedOut = NextResponse.redirect(loginUrl);
      clearAuthCookies(request, timedOut);
      return timedOut;
    }

    // Any request counts as activity and pushes the idle window forward.
    response.cookies.set(LAST_SEEN_COOKIE, String(now), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
  }

  /* ---------- admin gate ---------- */

  if (!isAdminPath) return response;

  const loginUrl = new URL(`/${locale}/admin/login`, request.url);
  if (!user) return NextResponse.redirect(loginUrl);

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'owner') {
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // /auth/* (the OAuth callback route) must stay unprefixed — next-intl
  // otherwise rewrites it to /en/auth/callback, which 404s since the
  // route handler lives at the unprefixed app/auth/callback.
  matcher: ['/((?!api|_next|_vercel|auth|.*\\..*).*)'],
};
