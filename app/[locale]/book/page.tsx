import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/session';
import BookWizard from '@/components/BookWizard';

export default async function BookPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSessionProfile();
  if (!session) redirect(`/${locale}/login?next=/book`);

  // The owner runs the calendar; she can't also take a slot on it. The
  // server action refuses too — this just avoids showing a wizard that
  // could never submit.
  if (session.profile.role === 'owner') redirect(`/${locale}/admin/calendar`);

  return <BookWizard locale={locale} />;
}
