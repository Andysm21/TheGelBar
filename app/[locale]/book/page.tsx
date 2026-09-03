import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/session';
import BookWizard from '@/components/BookWizard';

export default async function BookPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await getSessionProfile();
  if (!session) redirect(`/${locale}/login?next=/book`);

  return <BookWizard locale={locale} />;
}
