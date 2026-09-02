import AdminShell from '@/components/AdminShell';
import { MOCK_CLIENT } from '@/lib/mock-data';

export default function AdminClientsPage() {
  return (
    <AdminShell>
      <h1 style={{ fontSize: '1.3rem', color: 'var(--deep)', marginBottom: '1.5rem' }}>Clients</h1>
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="sans" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem', minWidth: 420 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Client</th>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Loyalty pts</th>
              <th style={{ textAlign: 'left', padding: '.6rem .5rem', borderBottom: '1px solid var(--border)', color: 'var(--sub)' }}>Email</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '.75rem .5rem', borderBottom: '1px solid #f6eef1' }}>{MOCK_CLIENT.name}</td>
              <td style={{ padding: '.75rem .5rem', borderBottom: '1px solid #f6eef1' }}>{MOCK_CLIENT.loyaltyPoints}</td>
              <td style={{ padding: '.75rem .5rem', borderBottom: '1px solid #f6eef1' }}>{MOCK_CLIENT.email}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>{MOCK_CLIENT.name} — private notes</div>
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="sans" style={{ fontSize: '.85rem' }}>{MOCK_CLIENT.adminPrivateNotes}</p>
        <p className="sans" style={{ fontSize: '.68rem', color: 'var(--sub)', marginTop: '.6rem' }}>Not visible to the client.</p>
      </div>
    </AdminShell>
  );
}
