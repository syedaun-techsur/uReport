'use client';
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { LayerGroup as LeafletLayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';

// Fix default marker icon URLs for Leaflet in Next.js (same pattern as PublicMap.tsx)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface DensityMapProps {
  startDate: string;
  endDate: string;
  statusFilter: 'open' | 'closed' | 'all';
}

interface GeoFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: { ticket_id: string; status: string; category_name: string; address_snippet: string };
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

/** Escape HTML special chars to prevent XSS in Leaflet popup content */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Inner component that renders markers on the existing map instance
function DensityLayer({ features }: { features: GeoFeature[] }) {
  const map = useMap();
  const layerGroupRef = useRef<LeafletLayerGroup | null>(null);

  useEffect(() => {
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    // Use leaflet.markercluster if available (already in package.json)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L_any = L as unknown as any;
    const markerGroup = L_any.markerClusterGroup
      ? L_any.markerClusterGroup()
      : L.layerGroup();

    for (const feature of features) {
      const [lng, lat] = feature.geometry.coordinates; // GeoJSON is [lng, lat]; Leaflet needs [lat, lng]
      const marker = L.marker([lat, lng]);
      marker.bindPopup(
        `<strong>${escapeHtml(feature.properties.category_name)}</strong><br/>${escapeHtml(feature.properties.address_snippet)}<br/><small>${escapeHtml(feature.properties.status)}</small>`
      );
      markerGroup.addLayer(marker);
    }

    markerGroup.addTo(map);
    layerGroupRef.current = markerGroup;

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [features, map]);

  return null;
}

export default function DensityMap({ startDate, endDate, statusFilter }: DensityMapProps) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading] = useState(true);

  const CITY_LAT = parseFloat(process.env.NEXT_PUBLIC_CITY_CENTER_LAT ?? '39.165325');
  const CITY_LNG = parseFloat(process.env.NEXT_PUBLIC_CITY_CENTER_LNG ?? '-86.526384');

  useEffect(() => {
    setLoading(true);
    const qs = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&status=${statusFilter}`;
    fetch(`/api/staff/reports/geo-density?${qs}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((fc: FeatureCollection) => {
        setFeatures(fc.features ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [startDate, endDate, statusFilter]);

  return (
    <div style={{ height: '100%', minHeight: 350, position: 'relative' }} data-testid="density-map">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
      <MapContainer
        center={[CITY_LAT, CITY_LNG]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <DensityLayer features={features} />
      </MapContainer>
    </div>
  );
}
