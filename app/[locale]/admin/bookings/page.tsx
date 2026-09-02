import AdminShell from '@/components/AdminShell';
import { getPendingBookingsForOwner } from '@/lib/mock-data';

export default function AdminBookingsQueuePage({ params: { locale } }: { params: { locale: string } }) {
  const pending = getPendingBookingsForOwner();

  return (
    <AdminShell>
      <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', marginBottom: '1.4rem' }}>Booking requests</h1>
      {pending.map((b) => (
        <a
          key={b.id}
          href={`/${locale}/admin/bookings/${b.id}`}
          className="card"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}
        >
          <div>
            <span className="badge badge-pending" style={{ marginBottom: '.4rem', display: 'inline-block' }}>
              Pending
            </span>
            <h3 style={{ fontSize: '1.05rem' }}>{b.clientName}</h3>
            <p className="sans" style={{ fontSize: '.78rem', color: 'var(--sub)', marginTop: '.3rem' }}>
              {new Date(b.scheduledStart).toLocaleString()} · {b.totalPriceEgp} EGP
            </p>
          </div>
          <span className="btn btn-primary" style={{ fontSize: '.68rem', padding: '.5rem 1rem' }}>
            Review →
          </span>
        </a>
      ))}
      {pending.length === 0 && <p className="sans" style={{ color: 'var(--sub)' }}>No pending requests.</p>}
    </AdminShell>
  );
}
