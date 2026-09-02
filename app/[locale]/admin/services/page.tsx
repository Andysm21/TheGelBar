import AdminShell from '@/components/AdminShell';
import { SERVICES_CATALOG, DESIGN_OPTIONS } from '@/lib/services-catalog';
import { formatDuration } from '@/lib/format';

export default function AdminServicesPage() {
  return (
    <AdminShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <h1 style={{ fontSize: '1.3rem', color: 'var(--deep)' }}>Services</h1>
        <button className="btn btn-primary" style={{ fontSize: '.68rem', padding: '.55rem 1rem' }}>
          + Add service
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="sans" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem', minWidth: 460 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Service</th>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Duration</th>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {SERVICES_CATALOG.map((s) => (
              <tr key={s.id}>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>{s.nameEn}</td>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>{formatDuration(s.baseMinutes)}</td>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>{s.basePriceEgp} EGP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 .8rem' }}>Design add-ons</div>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="sans" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem', minWidth: 360 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Design</th>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Tier</th>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {DESIGN_OPTIONS.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>{d.nameEn}</td>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1', textTransform: 'capitalize' }}>{d.tier}</td>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>+{d.priceEgp} EGP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 .8rem' }}>Loyalty program</div>
      <div className="card" style={{ maxWidth: 420 }}>
        <p className="sans" style={{ fontSize: '.82rem', lineHeight: 2 }}>
          1 point per completed &amp; paid session
          <br />
          Free at the 11th session (client sitting at exactly 10 points)
          <br />
          Free session grants no point — counter resets to 0, next session starts back at 1
        </p>
      </div>
    </AdminShell>
  );
}
