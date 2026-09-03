import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/session';
import BookWizard from '@/components/BookWizard';

export default async function BookPage({ params: { locale } }: { params: { locale: string } }) {
  const session = await getSessionProfile();
  if (!session) redirect(`/${locale}/login?next=/book`);

  return <BookWizard locale={locale} />;
}
