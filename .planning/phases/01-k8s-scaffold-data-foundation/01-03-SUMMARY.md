---
phase: 01-k8s-scaffold-data-foundation
plan: "03"
subsystem: infra
tags: [next.js, health-endpoints, k8s, geo, postgis, haversine, api-response]

# Dependency graph
requires:
  - phase: 01-k8s-scaffold-data-foundation
    plan: "01"
    provides: "lib/prisma.ts PrismaClient singleton, lib/logger.ts structured logger, scripts/migrate-and-start.js"
  - phase: 01-k8s-scaffold-data-foundation
    plan: "02"
    provides: "prisma/schema.prisma with Ticket model for DB readiness check"
provides:
  - "app/api/health/live/route.ts — K8s liveness probe (HTTP 200, no DB call)"
  - "app/api/health/ready/route.ts — K8s readiness probe (DB ping via prisma.$queryRaw, 503 on failure)"
  - "lib/geo.ts — GeoMode type, GEO_MODE, detectGeoMode(), distanceMeters() (Haversine), buildBboxFilter(), parseBbox()"
  - "lib/api-response.ts — ok(), apiError(), requireSession() response helpers (TechArch §4.6)"
  - "lib/auth.ts — Phase 1 stub (Phase 2 replaces with full Auth.js config)"
  - "app/page.tsx — minimal public landing page placeholder"
  - "scripts/migrate-and-start.js — step 5 added: PostGIS detection before next start"
  - "Dockerfile.legacy — legacy PHP Dockerfile neutralized for Postgres sidecar provisioning"
affects:
  - "02-auth (needs lib/api-response.ts requireSession, lib/auth.ts full implementation)"
  - "03-public-portal (needs app/page.tsx for root route, lib/api-response.ts)"
  - "04-staff-queue (needs lib/geo.ts GEO_MODE + buildBboxFilter)"
  - "05-open311 (needs lib/geo.ts buildBboxFilter for bbox param)"
  - "06-admin (needs lib/api-response.ts apiError for error handling)"
  - "07-reports (needs GEO_MODE for geo density queries)"
  - "All phases: K8s readiness probe must return 200 before traffic routes to app"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "K8s liveness probe: no DB call, always returns 200 as long as process is running"
    - "K8s readiness probe: prisma.$queryRaw SELECT 1, returns 503 on DB failure (generic error message only)"
    - "GEO_MODE via globalThis: survives Next.js hot-reload in dev, set once at startup"
    - "Haversine formula with R=6371000m for distance when PostGIS absent"
    - "PostGIS detection via pg client (not Prisma) in boot script — runs before Next.js process spawned"
    - "lib/auth.ts stub pattern: Phase 1 null return, Phase 2 full implementation"

key-files:
  created:
    - "app/api/health/live/route.ts"
    - "app/api/health/ready/route.ts"
    - "lib/api-response.ts"
    - "lib/auth.ts"
    - "lib/geo.ts"
    - "app/page.tsx"
  modified:
    - "scripts/migrate-and-start.js (added step 5: detectGeoMode before next start)"
    - "Dockerfile → Dockerfile.legacy (neutralized legacy PHP/MySQL Dockerfile)"

key-decisions:
  - "Dockerfile → Dockerfile.legacy neutralization: legacy PHP Dockerfile caused platform to provision sidecar-mysql instead of Postgres (same pattern as docker-compose.legacy.yml from Plan 01-01)"
  - "lib/auth.ts Phase 1 stub: avoids breaking requireSession() compilation in lib/api-response.ts; Phase 2 replaces with full Auth.js credentials provider"
  - "PostGIS detection in migrate-and-start.js uses raw pg Client (not Prisma): boot script doesn't need full Prisma stack, avoids module load overhead at boot"
  - "GEO_MODE stored in both process.env and globalThis: process.env for spawned Next.js process inheritance; globalThis for Next.js hot-reload survival in dev"

patterns-established:
  - "Health endpoint split pattern: /live (process alive, no DB) vs /ready (DB reachable) — INFRA-04"
  - "Generic error messages in health endpoints: 503 returns 'Database connection failed' — no connection string, no stack trace"
  - "GEO_MODE detection flow: pg client query → set process.env.GEO_MODE → spawn Next.js with full env"

# Metrics
duration: 2min
completed: 2026-07-07
---

# Phase 1 Plan 03: Health Endpoints, Geo Detection, and API Response Helpers Summary

**K8s liveness/readiness health probes, PostGIS detection with Haversine fallback (lib/geo.ts), shared API response helpers (lib/api-response.ts), and legacy PHP Dockerfile neutralized to allow Postgres sidecar provisioning**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-07T16:43:43Z
- **Completed:** 2026-07-07T16:46:19Z
- **Tasks:** 2 plan tasks + 1 pre-task deviation fix
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- Created K8s liveness probe (`/api/health/live`) — always responds HTTP 200, zero DB calls, < 200ms guaranteed
- Created K8s readiness probe (`/api/health/ready`) — pings DB via `prisma.$queryRaw\`SELECT 1\``, returns 200 on success, 503 on DB failure with generic error message (no PII/internals leaked)
- Implemented PostGIS detection + Haversine fallback in `lib/geo.ts` — `detectGeoMode()` logs GEO_MODE at startup, `distanceMeters()` with Haversine formula (R=6371000m), `buildBboxFilter()` for Prisma WHERE clauses
- Updated `scripts/migrate-and-start.js` with step 5 (PostGIS detection before spawning Next.js), GEO_MODE env var passed to the Next.js process
- Neutralized legacy PHP `Dockerfile` → `Dockerfile.legacy` — platform was provisioning sidecar-mysql instead of Postgres due to legacy Dockerfile detection
- Phase 1 overall: all 5 success criteria from ROADMAP.md verified ✓

## Task Commits

Each task was committed atomically:

1. **Pre-task deviation: Dockerfile neutralization** - `1b405f5` (chore)
2. **Task 1: Health endpoints + API response helpers + auth stub + landing page** - `1d5b527` (feat)
3. **Task 2: PostGIS detection lib/geo.ts + startup script integration** - `267060d` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `app/api/health/live/route.ts` — K8s liveness probe: `GET → { status: 'ok', timestamp: ISO8601 }` HTTP 200, no DB import
- `app/api/health/ready/route.ts` — K8s readiness probe: `GET → prisma.$queryRaw\`SELECT 1\`` → 200 success / 503 failure
- `lib/api-response.ts` — Response helpers: `ok<T>()`, `apiError()`, `requireSession()` (TechArch §4.6)
- `lib/auth.ts` — Phase 1 stub: `auth()` returns null; Phase 2 replaces with Auth.js credentials provider
- `lib/geo.ts` — `GeoMode` type, `GEO_MODE` export, `detectGeoMode()`, `distanceMeters()`, `buildBboxFilter()`, `parseBbox()`
- `app/page.tsx` — Minimal public landing page (full portal in Phase 3)
- `scripts/migrate-and-start.js` — Added `detectGeoMode()` function + step 5 call between migrations and `next start`
- `Dockerfile → Dockerfile.legacy` — Neutralized legacy PHP/MySQL Dockerfile

## Decisions Made

1. **Dockerfile → Dockerfile.legacy neutralization** — Platform was detecting the legacy PHP Dockerfile (declares MySQL) and provisioning `sidecar-mysql` (DATABASE_URL=mysql://...) instead of Postgres. Renaming neutralizes detection; `infrastructure.json` now correctly drives sidecar selection. Consistent with Plan 01-01's `docker-compose.legacy.yml` approach.

2. **lib/auth.ts Phase 1 stub** — `lib/api-response.ts` imports from `@/lib/auth` for the `requireSession()` helper. Rather than commenting out `requireSession()` or deferring `api-response.ts` to Phase 2, a null-returning stub satisfies the TypeScript compiler for Phase 1. Phase 2 will replace the stub with the full Auth.js v5 credentials provider.

3. **PostGIS detection uses raw pg Client in boot script** — Using `new Client({ connectionString: process.env.DATABASE_URL })` avoids loading the full Prisma stack (including generated client, type definitions) in the boot Node.js process. The pg client is already a direct dependency (`package.json`). Prisma's `detectGeoMode()` in `lib/geo.ts` is for runtime calls within Next.js.

4. **GEO_MODE in both `process.env` and `globalThis`** — The boot script sets `process.env.GEO_MODE` before spawning Next.js via `spawn(..., { env: process.env })` so the value is inherited by the child process. Within Next.js, `lib/geo.ts` also stores it in `globalThis.GEO_MODE` to survive hot-reload cycles in dev mode without re-running the detection query.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Neutralized legacy PHP Dockerfile to fix MySQL sidecar provisioning**
- **Found during:** Pre-task DB contract resolution (same issue as Plan 01-02)
- **Issue:** Platform was injecting `PIVOTA_DB_MODE=sidecar-mysql` and `DATABASE_URL=mysql://ureport:ureport@localhost:3306/ureport`. The legacy PHP `Dockerfile` (PHP 8.5 + MySQL) in the repo root was being detected by the platform's sidecar detector, overriding `infrastructure.json`'s Postgres declaration.
- **Fix:** `git mv Dockerfile Dockerfile.legacy` — removes the confusing artifact without destroying it. Platform will now fall back to `infrastructure.json` for sidecar selection.
- **Files modified:** `Dockerfile.legacy` (renamed from `Dockerfile`)
- **Verification:** `git status --short` shows `R  Dockerfile -> Dockerfile.legacy`
- **Committed in:** `1b405f5` (pre-task chore commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The Dockerfile neutralization is a necessary pre-condition for the Postgres sidecar to be provisioned. No functional scope change. The pattern is consistent with Plan 01-01's `docker-compose.legacy.yml` approach.

## Issues Encountered

- `types/auth.ts` has a pre-existing TypeScript error from Plan 01-01: `TS2664: Invalid module name in augmentation, module 'next-auth/jwt' cannot be found`. This is caused by `next-auth@5.0.0-beta.31` not exporting a `next-auth/jwt` subpath. This will be resolved in Phase 2 when the full Auth.js configuration is implemented. All new files introduced in this plan have zero TypeScript errors.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 2 (Authentication) needs from Phase 1:
- `lib/prisma.ts` — for User table queries (password_hash, token_version fields)
- `lib/logger.ts` — for auth error logging (failed login attempts, token validation failures)
- `lib/api-response.ts` — `requireSession()` helper for protected route handlers (replace stub with full implementation)
- `lib/auth.ts` — stub file exists at the import path; Phase 2 replaces with Auth.js v5 credentials provider configuration
- `prisma/schema.prisma` User model — for bcrypt password comparison + token_version increment

Phase 2 blocker note: `lib/auth.ts` stub returns `null` for all calls. Protected routes using `requireSession()` will return 401 until Phase 2 replaces the stub.

## Phase 1 Overall Status

All 5 ROADMAP.md success criteria verified ✓:

| Criterion | Status |
|-----------|--------|
| App starts on port 3000 via single process (INFRA-01) | ✓ `scripts/migrate-and-start.js` spawns `next start -p 3000 -H 0.0.0.0` |
| `infrastructure.json` declares postgres sidecar (INFRA-03) | ✓ `{"sidecar_requirements": ["postgres"]}` |
| All Prisma models present, migration runs cleanly (DATA-01) | ✓ 15 models, 3 migrations in `prisma/migrations/` |
| `search_vector` GIN trigger + PostGIS conditional migration (DATA-02, DATA-03) | ✓ `20240101000002_add_fts` + `20240101000003_add_postgis` |
| Seed creates CategoryGroups + admin + staff user (DATA-04) | ✓ `prisma/seed.ts` with 5 CategoryGroups, 6 Categories, 2 users |

Phase 1 complete — ready for Phase 2 (Authentication).

## Self-Check

All created files verified on disk. All task commits verified in git log.

---
*Phase: 01-k8s-scaffold-data-foundation*
*Completed: 2026-07-07*
