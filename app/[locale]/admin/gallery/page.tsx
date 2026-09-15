import AdminShell from '@/components/AdminShell';
import GalleryManager from '@/components/GalleryManager';
import { fetchGalleryForAdmin } from '@/lib/supabase/actions';

export default async function AdminGalleryPage() {
  const photos = await fetchGalleryForAdmin().catch(() => null);

  return (
    <AdminShell title="Gallery" subtitle="The photos on the Our Work page. Add, reorder or remove — changes go live straight away.">
      {photos === null ? (
        <p style={{ fontFamily: 'Arial, sans-serif', color: 'var(--danger)' }}>
          The gallery isn&apos;t set up in the database yet — run migration 005 in Supabase.
        </p>
      ) : (
        <GalleryManager initial={photos} />
      )}
    </AdminShell>
  );
}
