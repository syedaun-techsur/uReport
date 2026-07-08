'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';

// Fix broken default icons in Next.js (same pattern as ReportingMap.tsx)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface PublicMapProps {
  geojsonUrl: string;              // URL to fetch GeoJSON from (e.g. '/api/tickets/public-map')
  defaultCenter: [number, number]; // [lat, lng]
  defaultZoom?: number;            // default 12
}

interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    reference_id: string;
    ticket_id: string;
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

function ClusteredMarkers({
  geojsonUrl,
  onLoad,
}: {
  geojsonUrl: string;
  onLoad: (count: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clusterGroup = (L as any).markerClusterGroup();

    fetch(geojsonUrl)
      .then((r) => r.json())
      .then((geojson: GeoJSONCollection) => {
        geojson.features.forEach((f) => {
          const [lng, lat] = f.geometry.coordinates;
          const marker = L.marker([lat, lng]);
          const { reference_id, ticket_id } = f.properties;
          // Only safe alphanumeric strings are interpolated (CUID2 format)
          marker.bindPopup(
            `<div>
              <strong>Issue #${reference_id}</strong><br/>
              <a href="/tickets/${ticket_id}">View details →</a>
            </div>`
          );
          clusterGroup.addLayer(marker);
        });
        map.addLayer(clusterGroup);
        onLoad(geojson.features.length);
      })
      .catch(console.error);

    return () => {
      map.removeLayer(clusterGroup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, geojsonUrl]);

  return null;
}

export function PublicMap({ geojsonUrl, defaultCenter, defaultZoom = 12 }: PublicMapProps) {
  const [issueCount, setIssueCount] = useState<number | null>(null);

  return (
    <div>
      {issueCount === null && (
        <div className="flex items-center justify-center h-12 text-gray-500 text-sm">
          Loading map…
        </div>
      )}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '600px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClusteredMarkers geojsonUrl={geojsonUrl} onLoad={setIssueCount} />
      </MapContainer>
      {issueCount !== null && (
        <p className="text-sm text-gray-600 mt-2 px-2">
          Showing {issueCount} open issue{issueCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export default PublicMap;
