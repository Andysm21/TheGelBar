import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import BookingDetailActions from '@/components/BookingDetailActions';
import { getBookingById, getBookingImageUrls, getServiceCatalog } from '@/lib/supabase/cached-queries';
import styles from './detail.module.css';

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const booking = await getBookingById(id);
  const [imageUrls, catalog] = await Promise.all([
    getBookingImageUrls((booking.booking_images ?? []).map((i: any) => i.storage_path)),
    getServiceCatalog(),
  ]);

  const service = (catalog as any[]).find((s) => s.id === booking.service_id);
  const variants = service?.service_variants ?? [];
  const addonTotal = (booking.booking_addons ?? []).reduce(
    (sum: number, a: any) => sum + a.unit_price_egp * a.quantity,
    0
  );

  const start = new Date(booking.scheduled_start);
  const end = new Date(booking.scheduled_end);
  const whenLabel = `${start.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })} · ${start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <AdminShell
      title={booking.profiles?.name ?? 'Client'}
      subtitle={`Booking #${booking.id.slice(0, 8)} · ${booking.status}`}
      actions={
        <Link href={`/${locale}/admin/bookings`} className="btn btn-ghost btn-sm">
          ← All bookings
        </Link>
      }
    >
      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <section className={styles.card}>
            <p className="eyebrow">Appointment</p>
            <h2 className={styles.when}>{whenLabel}</h2>
            <p className={styles.until}>
              until {end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} ·{' '}
              {formatDuration(booking.total_minutes)}
            </p>

            <dl className={styles.details}>
              <div>
                <dt>Service</dt>
                <dd>
                  {booking.services?.name_en} — {booking.service_variants?.name_en}
                </dd>
              </div>
              {(booking.booking_addons ?? []).map((a: any) => (
                <div key={a.id}>
                  <dt>Add-on</dt>
                  <dd>
                    {a.addons?.name_en}
                    {a.quantity > 1 ? ` ×${a.quantity}` : ''} — {a.unit_price_egp * a.quantity} EGP
                  </dd>
                </div>
              ))}
              <div>
                <dt>Total</dt>
                <dd className={styles.total}>{booking.total_price_egp} EGP</dd>
              </div>
              {booking.amount_paid_egp !== null && booking.amount_paid_egp !== undefined && (
                <div>
                  <dt>Collected</dt>
                  <dd className={styles.total}>
                    {booking.amount_paid_egp} EGP
                    {booking.amount_paid_egp !== booking.total_price_egp && (
                      <span className={styles.adjusted}>
                        {' '}
                        ({booking.amount_paid_egp < booking.total_price_egp ? '−' : '+'}
                        {Math.abs(booking.total_price_egp - booking.amount_paid_egp)})
                      </span>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            {booking.payment_note && (
              <p className={styles.tierNote}>
                <strong>Payment note:</strong> {booking.payment_note}
              </p>
            )}

            {booking.tier_change_note && (
              <p className={styles.tierNote}>
                <strong>Price updated:</strong> {booking.tier_change_note}
              </p>
            )}
          </section>

          {booking.health_notes && (
            <section className={styles.card}>
              <p className="eyebrow">Client notes</p>
              <p className={styles.notes}>{booking.health_notes}</p>
            </section>
          )}

          <section className={styles.card}>
            <p className="eyebrow">Inspiration photos</p>
            {imageUrls.length === 0 ? (
              <p className={styles.empty}>No photos attached to this booking.</p>
            ) : (
              <div className={styles.photos}>
                {imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.photo}>
                    <img src={url} alt={`Inspiration ${i + 1}`} />
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sideCol}>
          <section className={styles.card}>
            <p className="eyebrow">Client</p>
            <h3 className={styles.clientName}>{booking.profiles?.name ?? 'Client'}</h3>
            <a href={`mailto:${booking.profiles?.email}`} className={styles.clientEmail}>
              {booking.profiles?.email}
            </a>
            <p className={styles.loyalty}>Loyalty: {booking.profiles?.loyalty_points ?? 0} pts</p>
          </section>

          <section className={styles.card}>
            <p className="eyebrow">Actions</p>
            <div style={{ marginTop: '1rem' }}>
              <BookingDetailActions
                bookingId={booking.id}
                status={booking.status}
                currentVariantId={booking.variant_id}
                currentVariantName={booking.service_variants?.name_en ?? ''}
                currentPrice={booking.total_price_egp}
                addonTotal={addonTotal}
                variants={variants}
                durationMinutes={booking.total_minutes}
                currentLabel={whenLabel}
                expectedTotal={booking.total_price_egp}
              />
            </div>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
