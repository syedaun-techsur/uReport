
---

## F09: Infrastructure & Platform

**Description:** The deployment, operations, and developer-experience foundation for uReport NG. This feature covers the Kubernetes-native single-pod deployment model, database bootstrapping, health check endpoints, 12-factor configuration, media storage architecture, structured logging, and PostGIS graceful degradation. These are not UI features — they are platform contracts that every other feature depends on.

**Terminology:**
- **Sidecar** — A Postgres 16 container injected alongside the app container in the same K8s pod, connected via `DATABASE_URL`.
- **Readiness probe** — A K8s HTTP check against `/api/health/ready` that returns `200` only when the DB is connected and all migrations are applied.
- **Liveness probe** — A K8s HTTP check against `/api/health/live` that returns `200` as long as the Node.js process is running.
- **`infrastructure.json`** — Pivota platform configuration file declaring `sidecar_requirements: ["postgres"]`.
- **12-factor** — All runtime configuration is sourced from environment variables; no secrets in the container image.
- **tsvector trigger** — A Postgres trigger function that automatically updates `Ticket.search_vector` when description, address, or title changes.

**Sub-features:**
- Single Next.js process on port 3000
- `infrastructure.json` sidecar declaration
- `prisma migrate deploy` at pod startup
- Seed data script (admin user, categories, departments)
- `GET /api/health/live` — liveness probe
- `GET /api/health/ready` — readiness probe with DB check
- Media storage as Postgres bytea
- `GET /api/media/[id]` — media serving with MIME headers
- Structured JSON request logging
- PostGIS auto-detection with Haversine fallback
- CSP/framing: no `X-Frame-Options: DENY/SAMEORIGIN` or `frame-ancestors 'none'`

---

### F09.1: Kubernetes Deployment

**Requirements:**
- `infrastructure.json` in repo root:
  ```json
  {
    "sidecar_requirements": ["postgres"],
    "port": 3000
  }
  ```
- `next.config.ts` (`.ts` extension, not `.js`) with `PIVOTA_DB_MODE=sidecar-postgres` support.
- `Dockerfile` (or equivalent): `ENTRYPOINT` runs `node scripts/migrate-and-start.js` which:
  1. Runs `prisma migrate deploy` (waits up to 60s for DB; retries with exponential backoff).
  2. On success, runs optional seed if `SEED_ON_BOOT=true` env var is set.
  3. Starts the Next.js server.
- Pod does not accept traffic until readiness probe passes.

---

### F09.2: Health Endpoints

**GET /api/health/live:**
- Returns `200 { status: "ok", timestamp: ISO8601 }` immediately if the process is running.
- No DB check. Always fast.

**GET /api/health/ready:**
- Executes `SELECT 1` against the Prisma DB connection.
- Checks that `prisma migrate status` reports no pending migrations (or simply verifies schema version table has latest migration applied).
- Returns `200 { status: "ready", db: "connected", migrations: "applied" }` if all checks pass.
- Returns `503 { status: "not_ready", error: "<reason>" }` if DB is unreachable or migrations pending.

---

### F09.3: Media Storage & Serving

**Storage:**
- Files ≤ 8KB stored as `bytea` directly in `Media.data`.
- Files > 8KB stored via Postgres Large Object API (`pg_largeobject`); `Media.lo_oid` stores the OID; `Media.data` is null.
- Actual threshold configurable via `MEDIA_LO_THRESHOLD_KB` env var (default 8).
- Max upload size: `MEDIA_MAX_SIZE_MB` env var (default 10MB).

**Serving (`GET /api/media/[id]`):**
1. Fetch `Media` record by ID. If not found → `404`.
2. Check ticket visibility: if media belongs to a non-public ticket, require `staff` or `admin` session.
3. Stream `data` bytes or read from Large Object.
4. Set headers: `Content-Type: {mime_type}`, `Content-Disposition: inline; filename="{filename}"`, `Cache-Control: private, max-age=3600`.
5. No local filesystem involvement.

---

### F09.4: Structured Logging

**Requirements:**
- All Next.js API route handlers log at minimum: `{ timestamp, method, path, status, duration_ms, user_id?, ticket_id? }` as JSON to stdout.
- Errors log full stack trace as `{ level: "error", message, stack, ... }`.
- `LOG_LEVEL` env var controls verbosity (`debug`|`info`|`warn`|`error`; default `info`).
- No PII in log fields (name, email, phone must not be logged).

---

### F09.5: PostGIS Auto-Detection

**Startup sequence:**
1. At app startup, execute: `SELECT PostGIS_Version()`.
2. If result returned: set `global.GEO_MODE = 'postgis'`.
3. If query throws: set `global.GEO_MODE = 'haversine'`. Log: `[INFO] PostGIS unavailable — using Haversine fallback`.
4. All geo distance/proximity queries in the codebase check `GEO_MODE`:
   - `postgis`: use `ST_DWithin(geography, geography, meters)` and `ST_Distance`.
   - `haversine`: use JavaScript Haversine formula applied to lat/lng values from DB result.

**Affected queries:**
- Staff queue bbox filter (F03)
- Related tickets proximity (F04)
- Geographic density map (F08)
- Open311 `GET /requests` bbox (F07)

---

### F09.6: Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | — | Prisma connection string (required) |
| `AUTH_SECRET` | — | Auth.js JWT signing secret (required) |
| `NEXTAUTH_URL` | — | Auth.js canonical URL (required in prod) |
| `AUTH_SESSION_TTL` | `28800` | Session TTL in seconds (8 hours) |
| `CITY_CENTER_LAT` | `39.165325` | Map default center latitude |
| `CITY_CENTER_LNG` | `-86.526384` | Map default center longitude |
| `CITY_BBOX_MINLAT` | — | City bounding box (optional) |
| `CITY_BBOX_MINLNG` | — | City bounding box (optional) |
| `CITY_BBOX_MAXLAT` | — | City bounding box (optional) |
| `CITY_BBOX_MAXLNG` | — | City bounding box (optional) |
| `OPEN311_RATE_LIMIT` | `60` | Max Open311 GET requests per minute per IP |
| `MEDIA_MAX_SIZE_MB` | `10` | Max upload size in MB |
| `MEDIA_LO_THRESHOLD_KB` | `8` | Bytea/LargeObject threshold in KB |
| `SEED_ON_BOOT` | `false` | Run seed script on startup |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `PIVOTA_DB_MODE` | — | `sidecar-postgres` when on Pivota platform |
| `TZ` | `America/Indiana/Indianapolis` | Server timezone for date display |

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Media not found | 404 | NOT_FOUND | "Media not found" |
| Media access unauthorized | 403 | FORBIDDEN | "Access denied" |
| Readiness: DB unreachable | 503 | DB_UNAVAILABLE | "Database connection failed" |
| Readiness: migrations pending | 503 | MIGRATIONS_PENDING | "Database migrations not applied" |
| Startup: DATABASE_URL missing | — | — | Process exits with error log |

**API Surface (this feature):**
- `GET /api/health/live` — liveness probe
- `GET /api/health/ready` — readiness probe
- `GET /api/media/[id]` — serve media file
→ see `Y1-api.md §Infrastructure`

**Schema Surface (this feature):** uses `Media` table — see `Y0-schema.md`.

---
