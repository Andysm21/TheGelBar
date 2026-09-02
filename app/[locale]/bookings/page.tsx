'use client';

import { useTranslations } from 'next-intl';
import { MOCK_CLIENT, getUpcomingBookings, canClientRescheduleOrCancel } from '@/lib/mock-data';
import { getService } from '@/lib/services-catalog';
import { useParams } from 'next/navigation';

export default function BookingsPage() {
  const t = useTranslations('booking');
  const { locale } = useParams<{ locale: string }>();
  const bookings = getUpcomingBookings(MOCK_CLIENT.id);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.25rem 1rem 4rem' }}>
      <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', marginBottom: '1.25rem' }}>My bookings</h1>

      {bookings.map((b) => {
        const canAct = canClientRescheduleOrCancel(b);
        const svc = getService(b.serviceId);
        const badgeClass = b.status === 'pending' ? 'badge-pending' : b.status === 'confirmed' ? 'badge-confirmed' : 'badge-declined';
        return (
          <div key={b.id} className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.6rem' }}>
              <span className={`badge ${badgeClass}`}>{t(b.status === 'pending' ? 'pending' : b.status === 'confirmed' ? 'confirmed' : 'needsReschedule')}</span>
              <span className="sans" style={{ fontSize: '.65rem', color: 'var(--sub)' }}>#{b.id}</span>
            </div>
            <h3 style={{ fontSize: '1rem' }}>{svc ? (locale === 'ar' ? svc.nameAr : svc.nameEn) : b.serviceId}</h3>
            <p className="sans" style={{ fontSize: '.76rem', color: 'var(--sub)', marginTop: '.3rem' }}>
              {new Date(b.scheduledStart).toLocaleString()} · {b.totalPriceEgp} EGP
            </p>

            {canAct ? (
              <div style={{ display: 'flex', gap: '.6rem', marginTop: '.9rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ fontSize: '.7rem', padding: '.55rem 1rem', minHeight: 40 }}>
                  {t('reschedule')}
                </button>
                <button className="btn btn-ghost" style={{ fontSize: '.7rem', padding: '.55rem 1rem', minHeight: 40, color: 'var(--danger)' }}>
                  {t('cancel')}
                </button>
              </div>
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
