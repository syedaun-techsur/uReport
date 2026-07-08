'use client';

import dynamic from 'next/dynamic';

// MANDATORY: ssr: false — Leaflet + MarkerCluster access window at init
const PublicMap = dynamic(() => import('@/components/maps/PublicMap').then((m) => m.PublicMap), {
  ssr: false,
});

const CITY_CENTER_LAT = parseFloat(process.env.NEXT_PUBLIC_CITY_CENTER_LAT ?? '39.165325');
const CITY_CENTER_LNG = parseFloat(process.env.NEXT_PUBLIC_CITY_CENTER_LNG ?? '-86.526384');

export default function PublicMapPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Open Issues Map</h1>
        <a href="/" className="text-blue-600 hover:underline text-sm">
          Report an issue →
        </a>
      </header>
      <div className="p-0">
        <PublicMap
          geojsonUrl="/api/tickets/public-map"
          defaultCenter={[CITY_CENTER_LAT, CITY_CENTER_LNG]}
          defaultZoom={12}
        />
      </div>
    </main>
  );
}
