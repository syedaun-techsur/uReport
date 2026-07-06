---

## 7. Integration Points

### 7.1 PostgreSQL 16 Sidecar (Required)

**Type:** Server-side hard dependency  
**Connection:** `DATABASE_URL` environment variable  
**Protocol:** Postgres wire protocol via Prisma ORM + `pg` driver

**Capabilities used:**
- Standard relational tables (Prisma ORM)
- Full-Text Search (`tsvector` columns + GIN indexes + `plainto_tsquery`)
- Large Object API (`pg_largeobject`) for media > `MEDIA_LO_THRESHOLD_KB`
- `bytea` columns for small media
- JSON/JSONB column (`filter_json` in `BookmarkedFilter`)

**PostGIS (optional extension):**
```
Detection query at startup:
  SELECT PostGIS_Version()
  
If present: global.GEO_MODE = 'postgis'
  → Uses: ST_DWithin(geog, ST_MakePoint(lng,lat)::geography, meters)
  → Uses: ST_Distance, ST_Within
  
If absent: global.GEO_MODE = 'haversine'
  → Falls back to: JavaScript Haversine formula on lat/lng values
  → No startup failure; geo features degrade gracefully (not disabled)
```

**Affected queries when PostGIS unavailable:**
- Staff queue bbox filter — falls back to `lat BETWEEN` / `lng BETWEEN` (approximate)
- Related tickets proximity (F04) — Haversine filter in app layer
- Geographic density map (F08) — returns all tickets; client-side clustering
- Open311 GET requests bbox — `lat`/`lng` range filter

**Failure behavior:** If DB is unreachable, `/api/health/ready` returns `503`. K8s readiness probe blocks traffic until DB connection succeeds. Application does not serve requests until readiness passes.

### 7.2 Auth.js v5 (Server-side Library)

**Type:** npm package (no external network call)  
**Config file:** `lib/auth.ts`

```typescript
// lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        const user = await prisma.user.findFirst({
          where: {
            username: { equals: String(credentials.username), mode: 'insensitive' },
            active: true,
          },
        });
        
        if (!user) return null;
        
        const passwordMatch = await bcrypt.compare(
          String(credentials.password),
          user.password_hash
        );
        
        if (!passwordMatch) return null;
        
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          department_id: user.department_id,
          token_version: user.token_version,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.department_id = (user as any).department_id;
        token.token_version = (user as any).token_version;
      }
      return token;
    },
    async session({ session, token }) {
      // Verify token_version hasn't been incremented (password reset)
      const dbUser = await prisma.user.findUnique({
        where: { id: String(token.id) },
        select: { token_version: true, active: true },
      });
      
      if (!dbUser || !dbUser.active || dbUser.token_version > Number(token.token_version)) {
        // Return empty session — triggers re-auth
        return { ...session, user: undefined } as any;
      }
      
      session.user = {
        ...session.user,
        id: String(token.id),
        username: String(token.username),
        role: token.role as any,
        department_id: token.department_id as string | null,
        token_version: Number(token.token_version),
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.AUTH_SESSION_TTL ?? '28800'),
  },
});
```

**Failure mode:** If `AUTH_SECRET` is not set, Auth.js throws a configuration error at startup — process exits. This is intentional (security requirement).

### 7.3 OpenStreetMap / Nominatim (Client-Side Geocoding)

**Type:** Client-side browser HTTP fetch (no server-side proxy)  
**No API key required**

**Endpoints:**
- Address search: `GET https://nominatim.openstreetmap.org/search?q={query}&format=json&countrycodes=us&limit=5`
- Reverse geocode: `GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json`

**Rate limit compliance:** Debounce input 300ms before sending requests. Nominatim policy: max 1 req/sec per user.

**Failure behavior:** If Nominatim is unreachable, the address search input shows "Address search unavailable" and user falls back to map pin placement. Ticket submission continues normally. Error code: `GEOCODE_UNAVAILABLE` (warning only, non-blocking).

### 7.4 OpenStreetMap Tile Server (Client-Side Map Tiles)

**Type:** Client-side Leaflet tile layer  
**No API key required**  
**Tile URL:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

**Attribution requirement (OSM policy):** Leaflet renders the OSM attribution layer automatically — no code required beyond using Leaflet's default attribution.

**Failure behavior:** If OSM tiles are unreachable, the map renders with a grey background. All app functionality (ticket submission, list views) is unaffected.

### 7.5 Open311 GeoReport v2 External Clients

**Type:** Inbound HTTP clients (third-party integrators)  
**Paths:** `/api/v2/**`

**Backward compatibility contract:**
- Field names match GeoReport v2 specification exactly (see §4.4 for mapping)
- `service_request_id`, `long` (not `lng`), `requested_datetime` (not `created_at`), etc.
- JSON default; XML via `?format=xml` or `Accept: application/xml`
- Open311 error format: `{ errors: [{ code, description }] }` (not the internal error envelope)
- Any field name or structure change requires a version bump

**XML serialization (no external library):**
```typescript
// lib/open311.ts — lightweight XML builder
export function toXml(obj: Record<string, any>, rootTag: string): string {
  const inner = Object.entries(obj).map(([key, val]) => {
    if (Array.isArray(val)) {
      return val.map(item => `<${key}>${objToXmlInner(item)}</${key}>`).join('');
    }
    return `<${key}>${escapeXml(String(val ?? ''))}</${key}>`;
  }).join('');
  return `<?xml version="1.0" encoding="utf-8"?><${rootTag}>${inner}</${rootTag}>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

### 7.6 Pivota Kubernetes Platform

**Type:** Deployment runtime  
**Contract:** `infrastructure.json` in repo root

```json
{
  "sidecar_requirements": ["postgres"],
  "port": 3000
}
```

**Platform-injected env vars:**
- `DATABASE_URL` — Postgres sidecar connection string
- `PIVOTA_DB_MODE=sidecar-postgres`

**K8s probe configuration:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  periodSeconds: 30
  timeoutSeconds: 2
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Health endpoint implementations:**

```typescript
// app/api/health/live/route.ts
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

// app/api/health/ready/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ready',
      db: 'connected',
      migrations: 'applied',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'not_ready', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
```

**CSP/Framing constraint:** The app must NOT emit `X-Frame-Options: DENY/SAMEORIGIN` or CSP `frame-ancestors 'none'/'self'` because Pivota Preview renders the app inside an `<iframe>`. This is enforced in `next.config.ts` by explicitly not setting those headers.

### 7.7 Leaflet + react-leaflet (Bundled Client Library)

**Type:** npm package — no external service call  
**SSR constraint:** All Leaflet components must be dynamically imported with `{ ssr: false }`:

```typescript
// Example: app/(public)/map/page.tsx
import dynamic from 'next/dynamic';

const PublicMap = dynamic(
  () => import('@/components/maps/PublicMap'),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" aria-label="Loading map..." />
  }
);
```

**Rationale:** Leaflet calls `document` and `window` during initialization. Next.js SSR doesn't have these globals, causing hydration mismatches and build errors without `ssr: false`.

**Clustering:** `leaflet.markercluster` — MIT license. Used in `PublicMap` (F01) and staff queue map view (F03).

### 7.8 Integration Dependency Summary

| Integration | Type | Required | Graceful Degradation |
|-------------|------|----------|---------------------|
| PostgreSQL 16 (sidecar) | Server-side | **Yes** — hard dep | Readiness probe blocks traffic until available |
| PostGIS extension | Server-side | No — optional | Haversine fallback; geo queries still work |
| Auth.js v5 | Server library | **Yes** | App exits if `AUTH_SECRET` missing |
| Nominatim / OSM Geocoding | Client-side HTTP | No | "Address search unavailable" warning; submission unaffected |
| OSM Tile Server | Client-side tiles | No | Grey map background; app fully functional |
| Open311 external clients | Inbound HTTP | No — external dep | They receive errors on app down; no app-side degradation |
| Pivota K8s platform | Deployment | **Yes** | N/A — platform provides the runtime |
| Leaflet (npm) | Client library | **Yes** (for maps) | Bundled; no external network; map views non-functional if JS disabled |

---
