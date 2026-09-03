import AdminShell from '@/components/AdminShell';
import LoyaltyToggle from '@/components/LoyaltyToggle';
import { getServiceCatalog, getDesignOptions, getAppSettings } from '@/lib/supabase/cached-queries';
import { formatDuration } from '@/lib/format';

export default async function AdminServicesPage() {
  const [services, designs, settings] = await Promise.all([getServiceCatalog(), getDesignOptions(), getAppSettings()]);

  return (
    <AdminShell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <h1 style={{ fontSize: '1.3rem', color: 'var(--deep)' }}>Services</h1>
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
            {services.map((s) => (
              <tr key={s.id}>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>{s.name_en}</td>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>{formatDuration(s.base_minutes)}</td>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>{s.base_price_egp} EGP</td>
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
            {designs.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>{d.name_en}</td>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1', textTransform: 'capitalize' }}>{d.tier}</td>
                <td style={{ padding: '.7rem .5rem', borderBottom: '1px solid #f6eef1' }}>+{d.price_egp} EGP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 .8rem' }}>Loyalty program</div>
      <div className="card" style={{ maxWidth: 420 }}>
        <LoyaltyToggle initialEnabled={settings.loyalty_enabled} />
        <p className="sans" style={{ fontSize: '.78rem', lineHeight: 1.9, marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '.8rem' }}>
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
