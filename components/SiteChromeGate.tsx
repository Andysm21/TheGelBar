'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';

/** Admin has its own AdminShell chrome; login screens are standalone.
 *  Everything else on the client-facing site gets the header + footer. */
export function useHasChrome() {
  const pathname = usePathname();
  return !(pathname?.includes('/admin') || pathname?.endsWith('/login'));
}

export default function SiteChromeGate({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const hasChrome = useHasChrome();

  if (!hasChrome) return <>{children}</>;

  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      {footer}
    </>
  );
}
