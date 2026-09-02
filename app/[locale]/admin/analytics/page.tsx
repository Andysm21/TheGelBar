import AdminShell from '@/components/AdminShell';

export default function AdminAnalyticsPage() {
  const weeks = [
    { label: 'Wk 1', value: 3200, pct: 45 },
    { label: 'Wk 2', value: 4600, pct: 65 },
    { label: 'Wk 3', value: 3700, pct: 52 },
    { label: 'Wk 4', value: 5600, pct: 80 },
    { label: 'Wk 5', value: 4850, pct: 70 },
  ];

  return (
    <AdminShell>
      <h1 style={{ fontSize: '1.4rem', color: 'var(--deep)', marginBottom: '1.75rem' }}>Analytics</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Revenue', value: '21,950 EGP', delta: '↑ 18%' },
          { label: 'Bookings', value: '58', delta: '↑ 9%' },
          { label: 'Avg. ticket', value: '378 EGP', delta: 'steady' },
          { label: 'Repeat clients', value: '72%', delta: '↑ 4%' },
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

      <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>Revenue by week</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.6rem', height: 160, paddingTop: '1rem' }}>
          {weeks.map((w) => (
            <div key={w.label} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: `${w.pct}%`,
                  background: 'linear-gradient(180deg,var(--gold),var(--pink))',
                  borderRadius: '6px 6px 0 0',
                  marginBottom: '.4rem',
                }}
              />
              <span className="sans" style={{ fontSize: '.68rem', color: 'var(--sub)' }}>
                {w.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
