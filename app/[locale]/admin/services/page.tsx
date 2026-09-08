import AdminShell from '@/components/AdminShell';
import CatalogEditor from '@/components/CatalogEditor';
import LoyaltyToggle from '@/components/LoyaltyToggle';
import { getCatalogForAdmin, getAppSettings } from '@/lib/supabase/cached-queries';

export default async function AdminServicesPage() {
  const [{ services, addons }, settings] = await Promise.all([getCatalogForAdmin(), getAppSettings()]);

  return (
    <AdminShell
      title="Catalog"
      subtitle="Prices and durations for every service and option — edits go live on the site."
    >
      <CatalogEditor services={services as any} addons={addons as any} settings={settings as any} />

      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.6rem', marginTop: '1.4rem', maxWidth: 480 }}>
        <p className="eyebrow" style={{ display: 'block', marginBottom: '1rem' }}>Loyalty programme</p>
        <LoyaltyToggle initialEnabled={settings.loyalty_enabled} />
      </section>
    </AdminShell>
  );
}
