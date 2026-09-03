import AdminShell from '@/components/AdminShell';
import { getTodayBookings, getPendingBookingsForOwner } from '@/lib/supabase/cached-queries';

export default async function AdminDashboardPage() {
  const [today, pending] = await Promise.all([getTodayBookings(), getPendingBookingsForOwner()]);

  return (
    <AdminShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--deep)' }}>Good morning, Mariam</h1>
        <span className="btn btn-primary" style={{ fontSize: '.7rem', padding: '.5rem 1rem' }}>
          {pending.length} pending requests
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="card">
          <div className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.4rem' }}>
            Today's bookings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{today.length}</div>
          <div className="sans" style={{ fontSize: '.68rem', color: 'var(--success)', marginTop: '.3rem' }}>
            {pending.length} pending approval
          </div>
        </div>
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>Pending requests</div>
      {pending.length === 0 && (
        <p className="sans" style={{ color: 'var(--sub)', fontSize: '.85rem' }}>
          No pending requests.
        </p>
      )}
      {pending.map((b: any) => (
        <a
          key={b.id}
          href={`admin/bookings/${b.id}`}
          className="card"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}
        >
          <div>
            <h3 style={{ fontSize: '1rem' }}>{b.profiles?.name ?? 'Client'}</h3>
            <p className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)', marginTop: '.2rem' }}>
              {b.services?.name_en} · {new Date(b.scheduled_start).toLocaleString()} · {b.total_price_egp} EGP
            </p>
          </div>
          <span className="badge badge-pending">Pending</span>
        </a>
      ))}

      <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>Today's schedule</div>
      {today.length === 0 && (
        <p className="sans" style={{ color: 'var(--sub)', fontSize: '.85rem' }}>
          Nothing booked today.
        </p>
      )}
      {today.map((b: any) => (
        <div key={b.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
          <div className="sans" style={{ fontSize: '.85rem' }}>
            {new Date(b.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {b.profiles?.name} · {b.services?.name_en}
          </div>
          <span className={`badge ${b.status === 'pending' ? 'badge-pending' : b.status === 'confirmed' ? 'badge-confirmed' : 'badge-done'}`}>{b.status}</span>
        </div>
      ))}
    </AdminShell>
  );
}
