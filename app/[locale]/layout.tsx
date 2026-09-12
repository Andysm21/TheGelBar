import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Playfair_Display } from 'next/font/google';
import { locales } from '@/i18n';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import SiteChromeGate from '@/components/SiteChromeGate';
import SiteFooter from '@/components/SiteFooter';
import SplashLoader from '@/components/SplashLoader';
import ScrollToTop from '@/components/ScrollToTop';
import SessionTimeout from '@/components/SessionTimeout';

// Editorial serif for headings — matches the "new-inspo" design
// direction (thebestnailsmiami.com). Self-hosted via next/font, so no
// external request/CSP concern.
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

// Not using generateStaticParams here: several routes (admin/*, book,
// dashboard) need to render dynamically anyway (auth-gated or
// user-specific), and next-intl's server APIs require either full static
// rendering everywhere (via setRequestLocale per page) or none — mixing
// is what caused the prerender failure. Simpler to render every locale
// route dynamically than to add setRequestLocale to every page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Gel Bar',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as any)) notFound();

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={playfair.variable}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ScrollToTop />
          <SessionTimeout />
          <SplashLoader />
          <SiteChromeGate footer={<SiteFooter locale={locale} />}>{children}</SiteChromeGate>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
