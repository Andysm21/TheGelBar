import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionProfile } from '@/lib/supabase/session';
import { getClientBookings } from '@/lib/supabase/cached-queries';
import BookingActions from '@/components/BookingActions';
import Reveal from '@/components/Reveal';
import styles from './bookings.module.css';

function canActOn(scheduledStart: string) {
  const hoursUntil = (new Date(scheduledStart).getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursUntil > 24;
}

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('booking');
  const session = await getSessionProfile();
  if (!session) redirect(`/${locale}/login`);

  const allBookings = await getClientBookings(session.user.id);
  const upcoming = allBookings.filter((b: any) => ['pending', 'confirmed', 'needs_reschedule'].includes(b.status));
  const past = allBookings.filter((b: any) => ['done', 'cancelled', 'declined'].includes(b.status));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className="eyebrow">Your account</p>
        <h1 className={styles.title}>My bookings</h1>
        <p className={styles.sub}>Signed in as {session.profile.email}</p>
      </header>

      {upcoming.length === 0 ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No upcoming appointments</h2>
          <p className={styles.emptyText}>Pick a service and a time that works — it only takes a minute.</p>
          <Link href={`/${locale}/book`} className="btn btn-solid">
            Book an appointment
          </Link>
        </div>
      ) : (
        upcoming.map((b: any, i: number) => {
          const canAct = canActOn(b.scheduled_start);
          const badgeClass =
            b.status === 'pending' ? 'badge-pending' : b.status === 'confirmed' ? 'badge-confirmed' : 'badge-declined';
          const statusLabel =
            b.status === 'pending' ? t('pending') : b.status === 'confirmed' ? t('confirmed') : t('needsReschedule');
          return (
            <Reveal key={b.id} delay={i * 80}>
              <article className={styles.item}>
                <div>
                  <div className={styles.itemTop}>
                    <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                    <span className={styles.ref}>#{b.id.slice(0, 8)}</span>
                  </div>
                  <h3 className={styles.service}>{b.services?.name_en ?? 'Service'}</h3>
                  {b.design_options?.name_en && <p className={styles.design}>+ {b.design_options.name_en}</p>}
                  <p className={styles.when}>
                    {new Date(b.scheduled_start).toLocaleString()}
                    <br />
                    <span className={styles.price}>{b.total_price_egp} EGP</span>
                  </p>
                </div>
                {canAct ? (
                  <BookingActions bookingId={b.id} />
                ) : (
                  <p className={styles.locked}>Within 24h — contact the studio directly to change this booking.</p>
                )}
              </article>
            </Reveal>
          );
        })
      )}

      {past.length > 0 && (
        <>
          <header className={styles.head} style={{ marginTop: '4rem' }}>
            <p className="eyebrow">History</p>
            <h2 className={styles.title} style={{ fontSize: '1.8rem' }}>
              Past visits
            </h2>
          </header>
          {past.map((b: any) => (
            <article key={b.id} className={styles.item}>
              <div>
                <div className={styles.itemTop}>
                  <span className="badge badge-done">{b.status}</span>
                  <span className={styles.ref}>#{b.id.slice(0, 8)}</span>
                </div>
                <h3 className={styles.service}>{b.services?.name_en ?? 'Service'}</h3>
                <p className={styles.when}>
                  {new Date(b.scheduled_start).toLocaleDateString()}
                  <br />
                  <span className={styles.price}>{b.total_price_egp} EGP</span>
                </p>
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
