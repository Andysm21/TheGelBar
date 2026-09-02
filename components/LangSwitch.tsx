'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';

export default function LangSwitch({ dark }: { dark?: boolean }) {
  const pathname = usePathname();
  const { locale } = useParams<{ locale: string }>();

  const otherLocale = locale === 'ar' ? 'en' : 'ar';
  const restOfPath = pathname?.replace(`/${locale}`, '') || '';
  const href = `/${otherLocale}${restOfPath}`;

  return (
    <Link
      href={href}
      className="sans"
      style={{
        fontSize: '.72rem',
        fontWeight: 700,
        letterSpacing: '.04em',
        padding: '.4rem .8rem',
        borderRadius: 20,
        border: `1px solid ${dark ? 'rgba(255,255,255,.3)' : 'var(--border)'}`,
        color: dark ? '#fff' : 'var(--deep)',
      }}
    >
      {otherLocale === 'ar' ? 'AR' : 'EN'}
    </Link>
  );
}
