'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix broken default icons in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ReportingMapProps {
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  defaultCenter: [number, number]; // [lat, lng]
  defaultZoom?: number; // default 13
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

function MapClickHandler({
  onLocationChange,
  onMarkerChange,
}: {
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  onMarkerChange: (pos: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onMarkerChange([lat, lng]);
      onLocationChange(lat, lng);

      // Reverse geocode via Nominatim
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'User-Agent': 'uReport-NG' } }
      )
        .then((r) => r.json())
        .then((data: { display_name?: string }) => {
          if (data.display_name) {
            onLocationChange(lat, lng, data.display_name);
          }
        })
        .catch(() => {
          // Nominatim failure is non-fatal — location still set without address
        });
    },
  });
  return null;
}

export function ReportingMap({
  onLocationChange,
  defaultCenter,
  defaultZoom = 13,
}: ReportingMapProps) {
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=us`,
        { headers: { 'User-Agent': 'uReport-NG' } }
      )
        .then((r) => r.json())
        .then((data: NominatimResult[]) => {
          setSearchResults(data);
          setShowDropdown(data.length > 0);
        })
        .catch(() => {
          setSearchResults([]);
          setShowDropdown(false);
        });
    }, 300);
  }, []);

  const selectResult = useCallback(
    (result: NominatimResult) => {
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      setMarkerPos([lat, lng]);
      setSearchQuery(result.display_name);
      setShowDropdown(false);
      onLocationChange(lat, lng, result.display_name);
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 16);
      }
    },
    [onLocationChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Address search input */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <input
          type="text"
          placeholder="Search address..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
        {showDropdown && searchResults.length > 0 && (
          <ul
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              zIndex: 1000,
              listStyle: 'none',
              margin: 0,
              padding: 0,
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            }}
          >
            {searchResults.map((r, i) => (
              <li
                key={i}
                onMouseDown={() => selectResult(r)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderBottom: i < searchResults.length - 1 ? '1px solid #f3f4f6' : undefined,
                }}
              >
                {r.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Leaflet map */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '400px', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler
          onLocationChange={onLocationChange}
          onMarkerChange={setMarkerPos}
        />
        {markerPos && <Marker position={markerPos} />}
      </MapContainer>
      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
        Click on the map to drop a pin at the issue location
      </p>
    </div>
  );
}

export default ReportingMap;
