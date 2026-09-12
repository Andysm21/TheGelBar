import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { getTodayBookings, getPendingBookingsForOwner, getAnalyticsSummary, getMonthAvailability } from '@/lib/supabase/cached-queries';
import { totalRangeMinutes } from '@/lib/availability';
import styles from './dashboard.module.css';

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default async function AdminDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const now = new Date();

  const [today, pending, stats, month] = await Promise.all([
    getTodayBookings(),
    getPendingBookingsForOwner(),
    getAnalyticsSummary(),
    getMonthAvailability(now.getFullYear(), now.getMonth()),
  ]);

  const todayStr = now.toISOString().slice(0, 10);
  const todayRanges = (month.ranges as any[]).filter((r) => r.date === todayStr);
  const freeToday = Math.round(totalRangeMinutes(todayRanges) / 60);
  const upcomingRanges = (month.ranges as any[]).filter((r) => r.date >= todayStr).length;

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <AdminShell
      title={`${greeting}, Mariam`}
      subtitle={now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      actions={
        <Link href={`/${locale}/admin/calendar`} className="btn btn-sm btn-solid">
          Set my hours
        </Link>
      }
    >
      {/* stat tiles */}
      <div className={styles.stats}>
        <div className={`${styles.stat} ${pending.length > 0 ? styles.statAlert : ''}`}>
          <span className={styles.statLabel}>Awaiting your reply</span>
          <span className={styles.statValue}>{pending.length}</span>
          <span className={styles.statMeta}>{pending.length === 1 ? 'request' : 'requests'}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Booked today</span>
          <span className={styles.statValue}>{today.length}</span>
          <span className={styles.statMeta}>{freeToday}h set as free</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Open windows ahead</span>
          <span className={styles.statValue}>{upcomingRanges}</span>
          <span className={styles.statMeta}>this month</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Revenue to date</span>
          <span className={styles.statValue}>{stats.revenue.toLocaleString()}</span>
          <span className={styles.statMeta}>EGP · {stats.bookingCount} done</span>
        </div>
      </div>

      <div className={styles.columns}>
        {/* pending queue */}
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <div>
              <p className="eyebrow">Needs action</p>
              <h2 className={styles.panelTitle}>Booking requests</h2>
            </div>
            <Link href={`/${locale}/admin/bookings`} className={styles.panelLink}>
              See all →
            </Link>
          </header>

          {pending.length === 0 ? (
            <p className={styles.empty}>Nothing waiting. You're all caught up.</p>
          ) : (
            <ul className={styles.list}>
              {pending.slice(0, 6).map((b: any) => (
                <li key={b.id}>
                  <Link href={`/${locale}/admin/bookings/${b.id}`} className={styles.row}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowName}>{b.profiles?.name ?? 'Client'}</span>
                      <span className={styles.rowMeta}>
                        {b.services?.name_en} · {b.service_variants?.name_en}
                        {(b.booking_images ?? []).length > 0 && ` · ${b.booking_images.length} photo(s)`}
                      </span>
                    </span>
                    <span className={styles.rowRight}>
                      <span className={styles.rowWhen}>
                        {new Date(b.scheduled_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {timeLabel(b.scheduled_start)}
                      </span>
                      <span className={styles.rowPrice}>{b.total_price_egp} EGP</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* today's schedule */}
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <div>
              <p className="eyebrow">Today</p>
              <h2 className={styles.panelTitle}>Your schedule</h2>
            </div>
            <Link href={`/${locale}/admin/calendar`} className={styles.panelLink}>
              Calendar →
            </Link>
          </header>

          {today.length === 0 ? (
            <p className={styles.empty}>
              Nothing booked today.
              {freeToday === 0 && ' You also haven’t set any free hours — clients can’t book until you do.'}
            </p>
          ) : (
            <ul className={styles.timeline}>
              {today.map((b: any) => (
                <li key={b.id} className={styles.tlItem}>
                  <span className={styles.tlTime}>
                    {timeLabel(b.scheduled_start)}
                    <em>{timeLabel(b.scheduled_end)}</em>
                  </span>
                  <Link href={`/${locale}/admin/bookings/${b.id}`} className={styles.tlCard}>
                    <span className={styles.rowName}>{b.profiles?.name ?? 'Client'}</span>
                    <span className={styles.rowMeta}>
                      {b.services?.name_en} · {b.service_variants?.name_en}
                    </span>
                    <span className={`badge badge-${b.status === 'pending' ? 'pending' : 'confirmed'}`}>{b.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
