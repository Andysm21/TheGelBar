import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { locales } from '@/i18n';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import LangSwitch from '@/components/LangSwitch';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

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
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as any)) notFound();

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <div style={{ position: 'fixed', top: 12, insetInlineEnd: 12, zIndex: 200 }}>
            <LangSwitch />
          </div>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
