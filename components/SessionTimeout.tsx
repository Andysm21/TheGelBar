'use client';

import { useEffect, useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IDLE_TIMEOUT_MS, TIMEOUT_PARAM } from '@/lib/auth/session-policy';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Signs an idle tab out without waiting for the next navigation.
 *
 * Middleware is what actually enforces the policy — it runs on every page
 * load and Server Action post, so a session is never usable past its
 * limit even with this component disabled. This exists purely so a tab
 * left open on a booking screen doesn't sit there looking signed in.
 */
export default function SessionTimeout() {
  const { locale } = useParams<{ locale: string }>();
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Nothing to expire on the sign-in screens themselves.
    if (!pathname || /\/(admin\/)?login\/?$/.test(pathname)) return;

    const supabase = createClient();
    let signedIn = false;
    let cancelled = false;

    async function expire() {
      if (cancelled || !signedIn) return;
      try {
        await supabase.auth.signOut();
      } catch {
        // Signing out locally is enough — the cookies are gone either way.
      }
      const isAdmin = pathname.includes('/admin');
      window.location.href = `/${locale}/${isAdmin ? 'admin/login' : 'login'}?${TIMEOUT_PARAM}=1`;
    }

    function arm() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(expire, IDLE_TIMEOUT_MS);
    }

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      signedIn = Boolean(data.user);
      if (signedIn) arm();
    });

    const onActivity = () => {
      if (signedIn) arm();
    };

    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onActivity);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onActivity);
    };
  }, [pathname, locale]);

  return null;
}
