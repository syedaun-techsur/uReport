---

## 6. Technology Stack

### 6.1 Core Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | `^15.0.0` | Full-stack App Router; single process port 3000 |
| **Runtime** | Node.js | `22.x` | Server runtime (Alpine-based image) |
| **Language** | TypeScript | `^5.x` | Strict mode throughout; `next.config.ts` required |
| **UI Library** | React | `^19.0.0` | Server + Client components (App Router) |
| **Database** | PostgreSQL | `16` | Primary data store (sidecar) |
| **ORM** | Prisma | `^6.x` | Type-safe DB access; `prisma migrate deploy` at boot |
| **Auth** | Auth.js (NextAuth) | `^5.x` | Credentials provider; JWT sessions |
| **Validation** | Zod | `^3.x` | Shared client+server request/response validation |
| **Password Hashing** | bcryptjs | `^2.x` | bcrypt work factor 12 |

### 6.2 Frontend Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **UI Components** | shadcn/ui | latest | Accessible, unstyled-first component library |
| **Styling** | Tailwind CSS | `^4.x` | Utility-first CSS; light/dark mode with `system` default |
| **Icons** | lucide-react | `^0.4x` | Icon set for UI actions and category icons |
| **Maps** | Leaflet | `^1.9.x` | Interactive map rendering |
| **React Maps** | react-leaflet | `^4.x` | React wrapper for Leaflet; requires `ssr: false` |
| **Map Clustering** | leaflet.markercluster | `^1.5.x` | Public map + staff queue map view clustering |
| **Charts** | Recharts | `^2.x` | Reports dashboard charts (bar, line, donut) |
| **Forms** | react-hook-form | `^7.x` | Form state management + Zod resolver |
| **Data Tables** | @tanstack/react-table | `^8.x` | Staff queue table (sort, filter, paginate) |

### 6.3 Testing Stack

| Tool | Version | Scope |
|------|---------|-------|
| **Vitest** | `^2.x` | Unit tests — data utilities, API handlers, schemas |
| **@testing-library/react** | `^16.x` | React component unit tests |
| **Playwright** | `^1.4x` | E2e tests — constituent portal, staff queue, login |
| **axe-core / @axe-core/playwright** | `^4.x` | Automated WCAG accessibility scan in e2e |

**Testing constraints:**
- No `testcontainers`, no `docker run` in test suite
- Unit tests run against mocked Prisma client (vitest mocks)
- E2e tests run against the running sidecar DB (already provisioned in Pivota sandbox)
- Open311 contract tests (Vitest): verify exact field name compliance per GeoReport v2 spec

### 6.4 Infrastructure & Ops

| Tool | Version | Purpose |
|------|---------|---------|
| **Prisma CLI** | `^6.x` | Migration management (`prisma migrate deploy` at boot) |
| **Node.js crypto** | built-in | SHA-256 for API key hashing (no external dep) |
| **pg** | `^8.x` | Node Postgres driver (used by Prisma internally; also direct for LO API) |

### 6.5 Package.json Key Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "prisma generate && next build",
    "start": "node scripts/migrate-and-start.js",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test --project=accessibility",
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

### 6.6 next.config.ts

```typescript
// next.config.ts  (MUST use .ts extension with Next.js 15+)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow Pivota Preview to embed this app in an iframe
  // DO NOT add X-Frame-Options or frame-ancestors CSP here
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // NOTE: Intentionally no X-Frame-Options header
          // NOTE: Intentionally no Content-Security-Policy frame-ancestors
        ],
      },
    ];
  },
  // Leaflet requires browser globals — ensure Leaflet deps don't break SSR
  serverExternalPackages: [],
};

export default nextConfig;
```

### 6.7 Infrastructure.json

```json
{
  "sidecar_requirements": ["postgres"],
  "port": 3000
}
```

### 6.8 Environment Variables Specification

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | **Required** | — | Prisma/pg connection string: `postgresql://user:pass@localhost:5432/ureport` |
| `AUTH_SECRET` | **Required** | — | Auth.js JWT signing secret (≥32 random chars). App exits if missing. |
| `NEXTAUTH_URL` | **Required (prod)** | — | Canonical URL for Auth.js redirects: `https://app.pivota.dev` |
| `AUTH_SESSION_TTL` | Optional | `28800` | Session TTL in seconds (default 8 hours) |
| `CITY_CENTER_LAT` | Optional | `39.165325` | Default map center latitude (Bloomington, IN) |
| `CITY_CENTER_LNG` | Optional | `-86.526384` | Default map center longitude |
| `CITY_BBOX_MINLAT` | Optional | — | City bounding box minimum latitude |
| `CITY_BBOX_MINLNG` | Optional | — | City bounding box minimum longitude |
| `CITY_BBOX_MAXLAT` | Optional | — | City bounding box maximum latitude |
| `CITY_BBOX_MAXLNG` | Optional | — | City bounding box maximum longitude |
| `OPEN311_RATE_LIMIT` | Optional | `60` | Max Open311 GET requests per minute per IP |
| `MEDIA_MAX_SIZE_MB` | Optional | `10` | Maximum upload file size in MB |
| `MEDIA_LO_THRESHOLD_KB` | Optional | `8` | File size threshold for bytea vs. Large Object (KB) |
| `SEED_ON_BOOT` | Optional | `false` | Run seed script on pod startup (`true`/`false`) |
| `LOG_LEVEL` | Optional | `info` | Logging verbosity: `debug`\|`info`\|`warn`\|`error` |
| `PIVOTA_DB_MODE` | Optional | — | Set to `sidecar-postgres` by Pivota platform |
| `TZ` | Optional | `America/Indiana/Indianapolis` | Server timezone for date display |
| `NODE_ENV` | Auto-set | — | `production` in built image; `development` in dev |

**Startup validation** (`scripts/migrate-and-start.js`):
```javascript
const required = ['DATABASE_URL', 'AUTH_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
```

### 6.9 Migrate-and-Start Script

```javascript
// scripts/migrate-and-start.js
const { execSync, spawn } = require('child_process');
const { Client } = require('pg');

const MAX_RETRIES = 12;
const RETRY_DELAY_BASE_MS = 2000;

async function waitForDb() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('[INFO] Database connection established.');
      return;
    } catch (err) {
      const delay = RETRY_DELAY_BASE_MS * Math.pow(1.5, i);
      console.log(`[INFO] Waiting for DB... retry ${i + 1}/${MAX_RETRIES} (${Math.round(delay)}ms)`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('[FATAL] Could not connect to database after max retries.');
  process.exit(1);
}

async function main() {
  // 1. Validate required env vars
  for (const key of ['DATABASE_URL', 'AUTH_SECRET']) {
    if (!process.env[key]) { console.error(`[FATAL] Missing: ${key}`); process.exit(1); }
  }

  // 2. Wait for DB
  await waitForDb();

  // 3. Run migrations (idempotent)
  console.log('[INFO] Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('[INFO] Migrations complete.');

  // 4. Optional seed
  if (process.env.SEED_ON_BOOT === 'true') {
    console.log('[INFO] Running seed script...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  }

  // 5. Start Next.js
  console.log('[INFO] Starting Next.js server...');
  const next = spawn('npx', ['next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    env: process.env,
  });
  next.on('exit', (code) => process.exit(code ?? 1));
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
```

---
