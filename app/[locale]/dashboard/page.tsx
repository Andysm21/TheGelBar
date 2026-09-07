import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/session';
import { getClientBookings, getAppSettings } from '@/lib/supabase/cached-queries';
import Reveal from '@/components/Reveal';
import styles from './dashboard.module.css';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const session = await getSessionProfile();
  if (!session) redirect(`/${locale}/login`);

  const [bookings, settings] = await Promise.all([getClientBookings(session.user.id), getAppSettings()]);
  const upcoming = bookings.filter((b: any) => ['pending', 'confirmed', 'needs_reschedule'].includes(b.status));
  const next = upcoming[0];
  const points = session.profile.loyalty_points;
  const toNextFree = 10 - (points % 10);
  const pct = Math.round((points % 10) * 10);
  const firstName = session.profile.name?.split(' ')[0] ?? 'there';

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className="eyebrow">Your account</p>
        <h1 className={styles.title}>Hi {firstName}</h1>
        <p className={styles.sub}>Here's what's coming up.</p>
      </header>

      {next ? (
        <Reveal>
          <section className={styles.nextCard}>
            <div>
              <span className="badge badge-pending">{t('booking.pending')}</span>
              <h2 className={styles.nextService}>{next.services?.name_en ?? 'Service'}</h2>
              <p className={styles.nextWhen}>{new Date(next.scheduled_start).toLocaleString()}</p>
            </div>
            <Link href={`/${locale}/bookings`} className="btn btn-sm">
              View
            </Link>
          </section>
        </Reveal>
      ) : (
        <Reveal>
          <section className={styles.emptyCard}>
            <h2 className={styles.emptyTitle}>Nothing booked yet</h2>
            <p className={styles.sub} style={{ marginBottom: '1.6rem' }}>
              Pick a service and a time that suits you.
            </p>
            <Link href={`/${locale}/book`} className="btn btn-solid">
              Book an appointment
            </Link>
          </section>
        </Reveal>
      )}

      {settings.loyalty_enabled && (
        <Reveal delay={90}>
          <section className={styles.loyalty}>
            <div>
              <p className="eyebrow">{t('loyalty.points')}</p>
              <div className={styles.points}>{points} pts</div>
              <p className={styles.sub}>{t('loyalty.toNextFree', { count: toNextFree })}</p>
            </div>
            <div className={styles.ring} style={{ background: `conic-gradient(var(--gold) ${pct}%, var(--border) 0)` }}>
              <span>{pct}%</span>
            </div>
          </section>
        </Reveal>
      )}

      <Reveal delay={140}>
        <Link href={`/${locale}/book`} className={styles.newBooking}>
          <div>
            <h3 className={styles.newTitle}>Book something new</h3>
            <p className={styles.sub}>Choose a service, pick a time, done.</p>
          </div>
          <span className={styles.arrow}>→</span>
        </Link>
      </Reveal>
    </div>
  );
}
