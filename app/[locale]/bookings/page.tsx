import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/session';
import { getClientBookings } from '@/lib/supabase/cached-queries';
import BookingActions from '@/components/BookingActions';

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

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.25rem 1rem 4rem' }}>
      <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', marginBottom: '1.25rem' }}>My bookings</h1>

      {upcoming.length === 0 && (
        <p className="sans" style={{ color: 'var(--sub)', fontSize: '.85rem' }}>
          No upcoming bookings yet.
        </p>
      )}

      {upcoming.map((b: any) => {
        const canAct = canActOn(b.scheduled_start);
        const badgeClass = b.status === 'pending' ? 'badge-pending' : b.status === 'confirmed' ? 'badge-confirmed' : 'badge-declined';
        const statusLabel = b.status === 'pending' ? t('pending') : b.status === 'confirmed' ? t('confirmed') : t('needsReschedule');
        return (
          <div key={b.id} className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.6rem' }}>
              <span className={`badge ${badgeClass}`}>{statusLabel}</span>
              <span className="sans" style={{ fontSize: '.65rem', color: 'var(--sub)' }}>
                #{b.id.slice(0, 8)}
              </span>
            </div>
            <h3 style={{ fontSize: '1rem' }}>{b.services?.name_en ?? 'Service'}</h3>
            {b.design_options?.name_en && (
              <p className="sans" style={{ fontSize: '.72rem', color: 'var(--sub)', marginTop: '.15rem' }}>
                + {b.design_options.name_en}
              </p>
            )}
            <p className="sans" style={{ fontSize: '.76rem', color: 'var(--sub)', marginTop: '.3rem' }}>
              {new Date(b.scheduled_start).toLocaleString()} · {b.total_price_egp} EGP
            </p>

            {canAct ? (
              <BookingActions bookingId={b.id} />
            ) : (
              <p className="sans" style={{ fontSize: '.68rem', color: 'var(--sub)', marginTop: '.7rem' }}>
                Within 24h — contact the salon directly to change this booking.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
