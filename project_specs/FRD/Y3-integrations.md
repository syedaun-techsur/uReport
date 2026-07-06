
---

## Y3: External Integration Points

This document catalogs all external systems and services that uReport NG interfaces with, including their contracts, failure modes, and graceful degradation behavior.

---

### Y3.1: OpenStreetMap / Nominatim (Geocoding)

**Purpose:** Address autocomplete and reverse geocoding on the public portal (F00) and map views.

**Integration type:** Client-side HTTP fetch from the browser (not server-side proxy in v1).

**Endpoint used:**
- Search: `https://nominatim.openstreetmap.org/search?q=<query>&format=json&countrycodes=us&limit=5`
- Reverse: `https://nominatim.openstreetmap.org/reverse?lat=<lat>&lon=<lng>&format=json`

**Contract:**
- Response: JSON array of `{ display_name, lat, lon, ... }` objects.
- Rate limit: Nominatim OSM has a 1 req/sec usage policy. The client debounces the search input (300ms delay before firing request).

**Failure mode:** If Nominatim is unreachable (network error or 5xx), the address search input shows "Address search unavailable" and the user falls back to map pin placement. Ticket submission continues normally without a geocoded address string — user may type the address manually.

**Error surfaced:** `GEOCODE_UNAVAILABLE` (non-blocking warning, not submission blocker).

**No API key required.** Usage attribution required per OSM tile usage policy (rendered Leaflet attribution layer fulfills this).

---

### Y3.2: OpenStreetMap Tile Server (Map Tiles)

**Purpose:** Raster map tiles for all Leaflet maps (public portal, public map, staff queue map view, ticket detail mini-map, reports heat map).

**Integration type:** Client-side Leaflet tile layer.

**Tile URL template:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

**Contract:** Tiles are fetched by the browser directly from OSM CDN. No server-side involvement.

**Failure mode:** If OSM tiles are unavailable, the map renders with a grey background (Leaflet fallback). All other application functionality is unaffected — the map is non-critical for ticket submission (coordinate pin is still tracked internally).

**No API key required.** OSM attribution must be visible on all map renders (Leaflet attribution layer).

---

### Y3.3: Postgres 16 Sidecar

**Purpose:** Primary data store — all application data, FTS indexes, and media storage.

**Integration type:** Server-side via Prisma ORM + `pg` driver.

**Connection:** `DATABASE_URL` environment variable (standard Postgres connection string).

**Contract:**
- Prisma schema defines the full data model.
- Migrations applied at startup via `prisma migrate deploy` (idempotent).
- FTS tsvector columns and GIN indexes added via raw SQL in migrations.
- Media stored as `bytea` (small) or Postgres Large Object (large files).

**PostGIS (optional extension):**
- App detects at startup via `SELECT PostGIS_Version()`.
- If present: uses `ST_DWithin`, `ST_Distance`, `ST_Within` for geo queries.
- If absent: falls back to Haversine formula computed in JavaScript.
- No startup failure if PostGIS is missing.

**Failure mode:** If DB is unreachable, the readiness probe (`/api/health/ready`) returns `503` and K8s blocks traffic. Application does not start serving requests until DB is available.

---

### Y3.4: Auth.js (NextAuth v5)

**Purpose:** Session management and credential authentication.

**Integration type:** Server-side library; no external service call.

**Contract:**
- Credentials provider calls `authorizeUser(username, password)` — local DB lookup only.
- JWT tokens signed with `AUTH_SECRET` env var.
- Session stored in httpOnly, Secure, SameSite=Lax cookie.
- No external identity provider, OAuth, or SAML in v1.

**Failure mode:** If `AUTH_SECRET` is not set, Auth.js throws at startup — application fails to start (intentional, security requirement).

---

### Y3.5: Open311 GeoReport v2 External Clients

**Purpose:** Third-party integrators (mobile apps, 311 aggregators) that consume the Open311 API surface.

**Integration type:** Inbound HTTP clients calling `/api/v2/**`.

**Contract:**
- Field names match GeoReport v2 spec exactly (see F07 field mapping tables).
- Both JSON and XML response formats supported.
- API keys issued via admin panel (F06f); keys hashed with SHA-256 at rest.
- Rate limiting applied to GET endpoints.

**Backward compatibility requirement:** All existing integrations must continue to work without change. Any modification to Open311 field names, response structure, or authentication mechanism is a breaking change and requires a version bump.

**Failure mode:** If the application is unavailable, integrators will receive connection refused or gateway errors from the K8s ingress. No circuit-breaker or retry logic is implemented at the application layer — K8s pod restarts and readiness probe guard against serving stale/broken responses.

---

### Y3.6: Pivota Kubernetes Platform

**Purpose:** Runtime environment — pod scheduling, health checks, environment variable injection.

**Integration type:** Declarative via `infrastructure.json` and Kubernetes probes.

**Contract:**
```json
// infrastructure.json (repo root)
{
  "sidecar_requirements": ["postgres"],
  "port": 3000
}
```

- `PIVOTA_DB_MODE=sidecar-postgres` env var is set by the platform.
- Liveness probe: `GET /api/health/live` — should return `200` within 2 seconds.
- Readiness probe: `GET /api/health/ready` — should return `200` before traffic is routed. Initial delay: 15 seconds; period: 10 seconds.
- Pod runs as single process on port 3000.

**CSP/Framing constraint:** The app must NOT emit `X-Frame-Options: DENY/SAMEORIGIN` or CSP `frame-ancestors 'none'` because Pivota Preview embeds the app in an iframe. This is a hard platform requirement.

---

### Y3.7: Leaflet + react-leaflet (Client Library)

**Purpose:** Interactive map rendering in browser for all map views.

**Integration type:** npm package bundled with the application. No external service call except OSM tiles.

**SSR constraint:** Leaflet components must be dynamically imported with `{ ssr: false }` in Next.js App Router to avoid hydration mismatch errors (Leaflet accesses `window` at initialization). All Leaflet-dependent components must be wrapped in `'use client'` boundaries.

**Clustering:** `leaflet.markercluster` library used for public map (F01) and staff queue map view (F03). License: MIT.

---

### Integration Dependency Summary

| Integration | Type | Required | Graceful Degradation |
|-------------|------|----------|---------------------|
| PostgreSQL 16 (sidecar) | Server-side | Yes — hard dependency | None; readiness probe blocks traffic |
| PostGIS extension | Server-side | No — optional | Haversine fallback for geo queries |
| Auth.js | Server-side library | Yes | None; app fails to start without AUTH_SECRET |
| Nominatim / OSM Geocoding | Client-side HTTP | No — map pin fallback | Address search shows warning; submission unaffected |
| OSM Tile Server | Client-side tiles | No | Grey map background; app fully functional |
| Open311 external clients | Inbound | No | They receive errors; no app-side degradation |
| Pivota K8s platform | Deployment | Yes | N/A — platform provides runtime |
| Leaflet (npm) | Client library | Yes — for map views | N/A — bundled; no external network call |

---
