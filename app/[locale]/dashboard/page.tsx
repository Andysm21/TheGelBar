import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/supabase/session';
import { getClientBookings, getAppSettings } from '@/lib/supabase/cached-queries';

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

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>
      <h1 style={{ fontSize: '1.6rem', color: 'var(--deep)' }}>Hi {session.profile.name?.split(' ')[0] ?? 'there'} 👋</h1>
      <p className="sans" style={{ color: 'var(--sub)', marginBottom: '1.5rem' }}>
        Here's what's coming up
      </p>

      {next && (
        <div className="card" style={{ background: 'linear-gradient(120deg,#fff0f5,#f9dce7)', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="badge badge-pending">{t('booking.pending')}</span>
              <h3 style={{ marginTop: '.6rem', fontSize: '1.1rem' }}>{next.services?.name_en ?? 'Service'}</h3>
              <p className="sans" style={{ fontSize: '.78rem', color: 'var(--sub)', marginTop: '.3rem' }}>
                {new Date(next.scheduled_start).toLocaleString()}
              </p>
            </div>
            <Link href={`/${locale}/bookings`} className="btn btn-ghost" style={{ fontSize: '.68rem', padding: '.5rem 1rem' }}>
              View
            </Link>
          </div>
        </div>
      )}

      {settings.loyalty_enabled && (
        <>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>{t('loyalty.points')}</div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--deep)' }}>{points} pts</div>
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
        </>
      )}

      <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>Book something new</div>
      <Link href={`/${locale}/book`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Start a new booking</h3>
          <p className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)', marginTop: '.3rem' }}>
            Choose a service, pick a time, done
          </p>
        </div>
        <span style={{ fontSize: '1.3rem', color: 'var(--pink)' }}>→</span>
      </Link>
    </div>
  );
}
