import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MOCK_CLIENT, getUpcomingBookings } from '@/lib/mock-data';
import { getService } from '@/lib/services-catalog';

export default function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations();
  const upcoming = getUpcomingBookings(MOCK_CLIENT.id);
  const next = upcoming[0];
  const toNextFree = 10 - (MOCK_CLIENT.loyaltyPoints % 10);
  const pct = Math.round((MOCK_CLIENT.loyaltyPoints % 10) * 10);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>
      <h1 style={{ fontSize: '1.6rem', color: 'var(--deep)' }}>Hi {MOCK_CLIENT.name.split(' ')[0]} 👋</h1>
      <p className="sans" style={{ color: 'var(--sub)', marginBottom: '1.5rem' }}>Here's what's coming up</p>

      {next && (
        <div className="card" style={{ background: 'linear-gradient(120deg,#fff0f5,#f9dce7)', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge badge-pending">{t('booking.pending')}</span>
              <h3 style={{ marginTop: '.6rem', fontSize: '1.1rem' }}>{getService(next.serviceId)?.nameEn ?? next.serviceId}</h3>
              <p className="sans" style={{ fontSize: '.78rem', color: 'var(--sub)', marginTop: '.3rem' }}>
                {new Date(next.scheduledStart).toLocaleString()}
              </p>
            </div>
            <Link href={`/${locale}/bookings`} className="btn btn-ghost" style={{ fontSize: '.68rem', padding: '.5rem 1rem' }}>
              View
            </Link>
          </div>
        </div>
      )}

      <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>{t('loyalty.points')}</div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--deep)' }}>{MOCK_CLIENT.loyaltyPoints} pts</div>
            <p className="sans" style={{ fontSize: '.72rem', color: 'var(--sub)' }}>
              {t('loyalty.toNextFree', { count: toNextFree })}
            </p>
          </div>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: `conic-gradient(var(--pink) ${pct}%, #f3e6ea 0)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Arial',
                fontSize: '.7rem',
                fontWeight: 700,
                color: 'var(--deep)',
              }}
            >
              {pct}%
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>Book something new</div>
      <Link href={`/${locale}/book`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Start a new booking</h3>
          <p className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)', marginTop: '.3rem' }}>
            Choose services, pick a time, done
          </p>
        </div>
        <span style={{ fontSize: '1.3rem', color: 'var(--pink)' }}>→</span>
      </Link>
    </div>
  );
}
