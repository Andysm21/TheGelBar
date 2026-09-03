import AdminShell from '@/components/AdminShell';
import { getBookingById } from '@/lib/supabase/cached-queries';
import { isFreeLoyaltySession, nextLoyaltyPoints } from '@/lib/services-catalog';
import BookingDetailActions from '@/components/BookingDetailActions';

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const booking = await getBookingById(id);
  const points = booking.profiles?.loyalty_points ?? 0;
  const isFree = isFreeLoyaltySession(points);

  return (
    <AdminShell>
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '.6rem' }}>
          <div>
            <a href={`/${locale}/admin/bookings`} className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)' }}>
              ← Back to requests
            </a>
            <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', marginTop: '.4rem' }}>Booking #{booking.id.slice(0, 8)}</h1>
          </div>
          <span className={`badge ${booking.status === 'pending' ? 'badge-pending' : booking.status === 'confirmed' ? 'badge-confirmed' : 'badge-done'}`}>{booking.status}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
          <div className="card">
            <p className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.5rem' }}>
              Client
            </p>
            <div style={{ fontWeight: 600 }}>{booking.profiles?.name ?? 'Client'}</div>
            <div className="sans" style={{ fontSize: '.72rem', color: 'var(--sub)' }}>
              Loyalty: {points} pts {isFree && <strong style={{ color: 'var(--deep)' }}>— free session!</strong>}
            </div>
          </div>
          <div className="card">
            <p className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.5rem' }}>
              Scheduled
            </p>
            <div style={{ fontWeight: 600 }}>{new Date(booking.scheduled_start).toLocaleString()}</div>
          </div>
        </div>

        {booking.health_notes && (
          <>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, margin: '1.5rem 0 .9rem' }}>Client notes</div>
            <div className="card">
              <p className="sans" style={{ fontSize: '.85rem' }}>{booking.health_notes}</p>
            </div>
          </>
        )}

        <div style={{ fontSize: '1.05rem', fontWeight: 600, margin: '1.5rem 0 .9rem' }}>
          {booking.status === 'pending' ? 'Respond to request' : booking.status === 'confirmed' ? 'Close out session' : 'Session'}
        </div>
        <BookingDetailActions
          bookingId={booking.id}
          status={booking.status}
          hasService={!!booking.services}
          hasDesign={!!booking.design_options}
          serviceLabel={locale === 'ar' ? booking.services?.name_ar ?? '' : booking.services?.name_en ?? ''}
          designLabel={booking.design_options ? (locale === 'ar' ? booking.design_options.name_ar : booking.design_options.name_en) : null}
          servicePriceEgp={booking.services?.base_price_egp ?? 0}
          designPriceEgp={booking.design_options?.price_egp ?? 0}
          isFree={isFree}
          nextPoints={nextLoyaltyPoints(points)}
        />
      </div>
    </AdminShell>
  );
}
