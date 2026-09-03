import createMiddleware from 'next-intl/middleware';
import { createServerClient, type CookieOptionsWithName } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { locales } from './i18n';

type CookieToSet = { name: string; value: string; options?: CookieOptionsWithName };

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
});

// Matches /en/admin/... or /ar/admin/... but not /admin/login itself.
const ADMIN_PATH = /^\/(en|ar)\/admin(?!\/login)(\/.*)?$/;

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const path = request.nextUrl.pathname;

  if (!ADMIN_PATH.test(path)) {
    return response;
  }

  // Without a live Supabase project (mock-data phase, see DEPLOY.md) this
  // check can't run — fail closed with a clear message rather than either
  // silently allowing everyone in or crashing on missing env vars.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Admin area unavailable: Supabase is not configured yet.', { status: 503 });
    }
    // Dev/mock mode: let it through so the mock-data admin pages remain
    // browsable while building, but this branch never runs once
    // .env.local is filled in — see DEPLOY.md §1b.
    return response;
  }

  const locale = path.split('/')[1];
  const loginUrl = new URL(`/${locale}/admin/login`, request.url);

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

  if (!user) {
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'owner') {
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
