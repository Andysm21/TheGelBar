import AdminShell from '@/components/AdminShell';
import { MOCK_BOOKINGS, getPendingBookingsForOwner } from '@/lib/mock-data';

export default function AdminDashboardPage() {
  const pending = getPendingBookingsForOwner();

  return (
    <AdminShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <h1 style={{ fontSize: '1.25rem', color: 'var(--deep)' }}>Good morning, Mariam</h1>
        <span className="btn btn-primary" style={{ fontSize: '.7rem', padding: '.5rem 1rem' }}>
          {pending.length} pending requests
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: "Today's bookings", value: String(MOCK_BOOKINGS.length), delta: `${pending.length} pending approval` },
          { label: "This week's revenue", value: '4,850 EGP', delta: '↑ 12% vs last week' },
          { label: 'New clients', value: '4', delta: 'this month' },
          { label: 'No-show rate', value: '3%', delta: 'last 30 days' },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.4rem' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{s.value}</div>
            <div className="sans" style={{ fontSize: '.68rem', color: 'var(--success)', marginTop: '.3rem' }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>Pending requests</div>
      {pending.map((b) => (
        <a
          key={b.id}
          href={`admin/bookings/${b.id}`}
          className="card"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}
        >
          <div>
            <h3 style={{ fontSize: '1rem' }}>{b.clientName}</h3>
            <p className="sans" style={{ fontSize: '.75rem', color: 'var(--sub)', marginTop: '.2rem' }}>
              {new Date(b.scheduledStart).toLocaleString()} · {b.totalPriceEgp} EGP
            </p>
          </div>
          <span className="badge badge-pending">Pending</span>
        </a>
      ))}
    </AdminShell>
  );
}
