'use client';
import dynamic from 'next/dynamic';

// The actual Leaflet component — only loaded client-side (ssr:false — LOCKED decision)
// CDN icon URLs used in _MiniMapInner to avoid Next.js static image import issues (LOCKED decision)
const MiniMapInner = dynamic(
  () => import('./_MiniMapInner').then(m => m.MiniMapInner),
  { ssr: false, loading: () => <div className="h-48 w-full rounded bg-gray-100 animate-pulse" /> }
);

export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return <MiniMapInner lat={lat} lng={lng} />;
}
