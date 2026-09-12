'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Next's App Router keeps the scroll position on some client-side
 * transitions (and the pinned GSAP section on the home page makes that
 * very obvious). This forces every route change to start at the top.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  return null;
}
