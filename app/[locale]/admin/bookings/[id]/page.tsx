'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import { MOCK_BOOKINGS, MOCK_CLIENT } from '@/lib/mock-data';
import { getService, getDesignOption, isFreeLoyaltySession, nextLoyaltyPoints } from '@/lib/services-catalog';

export default function AdminBookingDetailPage() {
  const { id, locale } = useParams<{ id: string; locale: string }>();
  const booking = MOCK_BOOKINGS.find((b) => b.id === id) ?? MOCK_BOOKINGS[0];
  const service = getService(booking.serviceId);
  const design = booking.designId ? getDesignOption(booking.designId) : undefined;

  const [serviceDone, setServiceDone] = useState(true);
  const [designDone, setDesignDone] = useState(!!design);
  const [paid, setPaid] = useState(false);

  const isFree = isFreeLoyaltySession(MOCK_CLIENT.loyaltyPoints);

  const originalPrice = (serviceDone ? service?.basePriceEgp ?? 0 : 0) + (designDone && design ? design.priceEgp : 0);
  const finalPrice = isFree ? 0 : originalPrice;
  const pointsAfter = nextLoyaltyPoints(MOCK_CLIENT.loyaltyPoints);

  return (
    <AdminShell>
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '.6rem' }}>
          <div>
            <a href={`/${locale}/admin/bookings`} className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)' }}>
              ← Back to requests
            </a>
            <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', marginTop: '.4rem' }}>Booking #{booking.id}</h1>
          </div>
          <span className="badge badge-pending">{booking.status}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem' }}>
          <div className="card">
            <p className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.5rem' }}>
              Client
            </p>
            <div style={{ fontWeight: 600 }}>{booking.clientName}</div>
            <div className="sans" style={{ fontSize: '.72rem', color: 'var(--sub)' }}>
              Loyalty: {MOCK_CLIENT.loyaltyPoints} pts {isFree && <strong style={{ color: 'var(--deep)' }}>— free session!</strong>}
            </div>
          </div>
          <div className="card">
            <p className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.5rem' }}>
              Scheduled
            </p>
            <div style={{ fontWeight: 600 }}>{new Date(booking.scheduledStart).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ fontSize: '1.05rem', fontWeight: 600, margin: '1.5rem 0 .9rem' }}>Close out session</div>
        <div className="card">
          <p className="sans" style={{ fontSize: '.72rem', color: 'var(--sub)', marginBottom: '.9rem' }}>
            Confirm what was actually done — price recalculates automatically.
          </p>

          {service && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem 0', borderBottom: '1px solid #f6eef1' }}>
              <input type="checkbox" checked={serviceDone} onChange={(e) => setServiceDone(e.target.checked)} />
              <span style={{ flex: 1 }}>{locale === 'ar' ? service.nameAr : service.nameEn}</span>
              <span className="sans" style={{ color: 'var(--sub)' }}>{service.basePriceEgp} EGP</span>
            </label>
          )}
          {design && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem 0', borderBottom: '1px solid #f6eef1' }}>
              <input type="checkbox" checked={designDone} onChange={(e) => setDesignDone(e.target.checked)} />
              <span style={{ flex: 1 }}>{locale === 'ar' ? design.nameAr : design.nameEn}</span>
              <span className="sans" style={{ color: 'var(--sub)' }}>{design.priceEgp} EGP</span>
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <span className="sans" style={{ fontWeight: 700 }}>Final price</span>
            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--deep)' }}>
              {isFree ? (
                <>
                  <span style={{ textDecoration: 'line-through', color: 'var(--sub)', fontSize: '.9rem', marginInlineEnd: '.5rem' }}>
                    {originalPrice} EGP
                  </span>
                  0 EGP
                </>
              ) : (
                `${finalPrice} EGP`
              )}
            </span>
          </div>

          {!paid ? (
            <button className="btn btn-primary btn-block" style={{ marginTop: '1.2rem' }} onClick={() => setPaid(true)}>
              Mark as Paid — Done
            </button>
          ) : (
            <div className="sans" style={{ marginTop: '1.2rem', textAlign: 'center', color: 'var(--success)', fontWeight: 700 }}>
              ✓ Paid &amp; done — loyalty now at {pointsAfter} pt{pointsAfter === 1 ? '' : 's'}
              {isFree ? ' (reset after free session)' : ''}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
