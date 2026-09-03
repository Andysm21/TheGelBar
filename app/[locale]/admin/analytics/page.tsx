import AdminShell from '@/components/AdminShell';
import { getAnalyticsSummary } from '@/lib/supabase/cached-queries';

export default async function AdminAnalyticsPage() {
  const stats = await getAnalyticsSummary();

  return (
    <AdminShell>
      <h1 style={{ fontSize: '1.3rem', color: 'var(--deep)', marginBottom: '1.5rem' }}>Analytics</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <div className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.4rem' }}>
            Revenue (all time)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.revenue.toLocaleString()} EGP</div>
        </div>
        <div className="card">
          <div className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.4rem' }}>
            Completed bookings
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.bookingCount}</div>
        </div>
        <div className="card">
          <div className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.4rem' }}>
            Avg. ticket
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.avgTicket} EGP</div>
        </div>
        <div className="card">
          <div className="sans" style={{ fontSize: '.68rem', textTransform: 'uppercase', color: 'var(--sub)', marginBottom: '.4rem' }}>
            Repeat clients
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.repeatPct}%</div>
        </div>
      </div>
      <p className="sans" style={{ fontSize: '.72rem', color: 'var(--sub)', marginTop: '1.5rem' }}>
        Based on bookings marked "done" (paid) — nothing here is estimated.
      </p>
    </AdminShell>
  );
}
