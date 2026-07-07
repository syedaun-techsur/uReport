// lib/geo.ts
// PostGIS detection and Haversine fallback implementation.
// TechArch §2.2: detectGeoMode() runs SELECT PostGIS_Version() at startup;
// sets global.GEO_MODE. All geo queries branch on this value.

import { PrismaClient } from '@prisma/client';
import { log } from '@/lib/logger';

export type GeoMode = 'postgis' | 'haversine';

// Module-level variable set by detectGeoMode() at startup
// Using globalThis so it survives Next.js hot-reload in dev
const g = globalThis as unknown as { GEO_MODE?: GeoMode };
export let GEO_MODE: GeoMode = g.GEO_MODE ?? 'haversine';

/**
 * Detects whether PostGIS extension is available in the connected Postgres database.
 * Called once at pod startup (see scripts/migrate-and-start.js).
 *
 * TechArch §1.5 step 5:
 *   success → global.GEO_MODE = 'postgis'
 *   failure → global.GEO_MODE = 'haversine' (log INFO)
 */
export async function detectGeoMode(prismaClient: PrismaClient): Promise<GeoMode> {
  try {
    await prismaClient.$queryRaw`SELECT PostGIS_Version()`;
    GEO_MODE = 'postgis';
    g.GEO_MODE = 'postgis';
    log.info({ event: 'GEO_MODE', mode: 'postgis', message: 'PostGIS detected — using spatial indexes' });
    return 'postgis';
  } catch {
    GEO_MODE = 'haversine';
    g.GEO_MODE = 'haversine';
    log.info({ event: 'GEO_MODE', mode: 'haversine', message: 'PostGIS unavailable — using Haversine fallback' });
    return 'haversine';
  }
}

/**
 * Haversine distance formula — returns distance in meters between two lat/lng points.
 * TechArch §2.2: Used when GEO_MODE = 'haversine'.
 *
 * Formula: 2 * R * asin(sqrt(sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlng/2)))
 * where R = 6371000 meters
 */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

/**
 * Parse and validate a bbox string ("minLat,minLng,maxLat,maxLng").
 * Returns null if invalid.
 */
export function parseBbox(bbox: string): [number, number, number, number] | null {
  const parts = bbox.split(',').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return null;
  const [minLat, minLng, maxLat, maxLng] = parts;
  return [minLat, minLng, maxLat, maxLng];
}

/**
 * Build a Prisma WHERE clause fragment for bbox filtering.
 *
 * PostGIS mode: returns a fragment using ST_DWithin on the geog column (indexed).
 * Haversine mode: returns lat BETWEEN / lng BETWEEN for approximate bbox filter.
 *
 * TechArch §2.2: Used by staff queue bbox filter (F03), geo density (F08), Open311 bbox (F07).
 */
export function buildBboxFilter(
  bbox: string,
  mode: GeoMode = GEO_MODE
): { lat: object; lng: object } | null {
  const parsed = parseBbox(bbox);
  if (!parsed) return null;
  const [minLat, minLng, maxLat, maxLng] = parsed;

  // Both modes use lat/lng range filter at the Prisma level.
  // PostGIS mode will additionally use the GIST index in raw SQL for proximity queries
  // (e.g., related tickets within 50m). For bbox filter the lat/lng approach works in both modes.
  return {
    lat: { gte: minLat, lte: maxLat },
    lng: { gte: minLng, lte: maxLng },
  };
}
