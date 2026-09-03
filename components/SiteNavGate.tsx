'use client';

import { usePathname } from 'next/navigation';
import SiteNav from './SiteNav';

// Admin has its own AdminShell sidebar; login/admin-login are standalone
// screens. Everywhere else on the client-facing site gets SiteNav.
export default function SiteNavGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.includes('/admin');
  const isLogin = pathname?.endsWith('/login');

  if (isAdmin || isLogin) return <>{children}</>;

  return (
    <>
      <SiteNav />
      <div className="site-content">{children}</div>
    </>
  );
}
