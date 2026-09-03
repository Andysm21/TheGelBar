import NailLoader from '@/components/NailLoader/NailLoader';

// Next renders this automatically while a route segment under [locale]
// is loading (navigation, data fetching) — same loader as the splash,
// just without forcing a fixed caption change on every render.
export default function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <NailLoader size="full" />
    </div>
  );
}
