import AdminShell from '@/components/AdminShell';
import { getAllClients } from '@/lib/supabase/cached-queries';
import ClientNotesEditor from '@/components/ClientNotesEditor';

export default async function AdminClientsPage() {
  const clients = await getAllClients();
  const firstClient = clients[0];

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
            {clients.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: '.75rem .5rem', borderBottom: '1px solid #f6eef1' }}>{c.name ?? '—'}</td>
                <td style={{ padding: '.75rem .5rem', borderBottom: '1px solid #f6eef1' }}>{c.loyalty_points}</td>
                <td style={{ padding: '.75rem .5rem', borderBottom: '1px solid #f6eef1' }}>{c.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="sans" style={{ padding: '1rem', color: 'var(--sub)' }}>
            No clients yet.
          </p>
        )}
      </div>

      {firstClient && (
        <>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, margin: '1.75rem 0 .9rem' }}>{firstClient.name} — private notes</div>
          <div className="card" style={{ maxWidth: 480 }}>
            <ClientNotesEditor clientId={firstClient.id} initialNotes={firstClient.admin_private_notes ?? ''} />
            <p className="sans" style={{ fontSize: '.68rem', color: 'var(--sub)', marginTop: '.6rem' }}>
              Not visible to the client. Select a different client from the table to edit theirs (coming soon).
            </p>
          </div>
        </>
      )}
    </AdminShell>
  );
}
