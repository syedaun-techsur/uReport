---
phase: 07-reports-metrics-dashboard
plan: "01"
subsystem: reports
tags: [reports, metrics, aggregation, geojson, zod, vitest, prisma-raw-sql, cache-control]
dependency_graph:
  requires:
    - "Ticket, Category, Department, TicketHistory models (Phase 01 Prisma schema)"
    - "requireSession('staff') from lib/api-response.ts (Phase 02 auth)"
  provides:
    - "GET /api/staff/reports/volume-by-category — time-series ticket volume by category"
    - "GET /api/staff/reports/volume-by-department — time-series ticket volume by department"
    - "GET /api/staff/reports/status-breakdown — open/in_progress/closed/archived counts"
    - "GET /api/staff/reports/resolution-time — mean + median resolution hours by category or department"
    - "GET /api/staff/reports/geo-density — GeoJSON FeatureCollection of geolocated tickets"
    - "schemas/reports.ts — DateRangeSchema, VolumeQuerySchema, ResolutionQuerySchema, GeoDensityQuerySchema"
    - "lib/reports.ts — resolveDateRange, shapeVolumeRows, shapeResolutionRows pure helpers"
  affects:
    - "07-02 dashboard page (will consume all five endpoints)"
tech_stack:
  added:
    - "vitest ^2.1.0 (was in devDependencies but not installed; npm install applied)"
    - "vitest.config.ts with @/ path alias for unit tests"
  patterns:
    - "Prisma.$queryRaw with Prisma.sql template literals — all aggregation SQL parameterized"
    - "date_trunc(interval, created_at) for time-series bucketing with Zod-validated interval enum"
    - "PERCENTILE_CONT(0.5) WITHIN GROUP for median resolution time"
    - "Prisma.sql fragment composition for dynamic WHERE clauses (geo-density status filter)"
    - "bigint → number conversion via Number() for all PostgreSQL COUNT(*) results"
    - "GeoJSON FeatureCollection with coordinates [lng, lat] per RFC 7946"
    - "Cache-Control: no-store on all report responses (RPT-04)"
key_files:
  created:
    - schemas/reports.ts
    - lib/reports.ts
    - __tests__/reports.test.ts
    - vitest.config.ts
    - app/api/staff/reports/volume-by-category/route.ts
    - app/api/staff/reports/volume-by-department/route.ts
    - app/api/staff/reports/status-breakdown/route.ts
    - app/api/staff/reports/resolution-time/route.ts
    - app/api/staff/reports/geo-density/route.ts
  modified: []
decisions:
  - "Prisma.sql fragment composition for geo-density status filter — Zod-validated enum selects pre-built Prisma.sql literal; user string never interpolated into SQL text"
  - "COALESCE(d.id, 'unassigned') in volume-by-department — unassigned tickets grouped under synthetic id 'unassigned' rather than NULL to produce consistent response shape"
  - "TypeScript type annotation for volume-by-department rows uses string (not string | null) because COALESCE guarantees non-null result at SQL level"
  - "vitest.config.ts added to resolve @/ path alias in unit tests — no vitest config existed in project"
metrics:
  duration: "6min"
  completed_date: "2026-07-09"
  tasks: 2
  files: 9
---

# Phase 07 Plan 01: Report API Routes Summary

**One-liner:** Five staff-authenticated report endpoints with Prisma.sql aggregations, Zod date-range validation (DATE_RANGE_INVALID/TOO_WIDE 422), Cache-Control: no-store, and 11 Vitest unit tests covering date defaults, range validation, and bigint→number shaping.

## What Was Built

Implemented the complete data layer for the Phase 7 metrics dashboard — all five report endpoints query live Postgres on every request with no caching (RPT-04).

### Shared Infrastructure

**`schemas/reports.ts`** — Zod validation schemas for all report query params:
- `DateRangeSchema`: optional ISO8601 datetime fields with two refinements — `start_date > end_date` → `DATE_RANGE_INVALID`; range > 366 days → `DATE_RANGE_TOO_WIDE`
- `VolumeQuerySchema`: DateRange + `interval: enum('day','week','month').default('day')`
- `ResolutionQuerySchema`: DateRange + `group_by: enum('category','department').default('category')`
- `GeoDensityQuerySchema`: DateRange + `status: enum('open','closed','all').default('all')`

**`lib/reports.ts`** — Pure helper functions (no Prisma imports):
- `resolveDateRange()`: applies defaults (30 days ago / now) when dates are absent
- `shapeVolumeRows()`: converts bigint COUNT to number, formats Date period to YYYY-MM-DD string
- `shapeResolutionRows()`: converts bigint count and numeric strings to number, rounds mean/median to 1 decimal

**`vitest.config.ts`** — Vitest config with `@/` path alias resolving to project root.

**`__tests__/reports.test.ts`** — 11 unit tests covering:
- `resolveDateRange` defaults and explicit values
- `DateRangeSchema` invalid ranges and valid cases
- `shapeVolumeRows` bigint conversion and period formatting
- `shapeResolutionRows` rounding to 1 decimal
- `VolumeQuerySchema` defaults and rejection of unknown intervals

### Report API Route Handlers

All five routes share the same pattern:
1. `requireSession('staff')` — returns 401 if unauthenticated
2. Zod parse of `req.nextUrl.searchParams` with appropriate schema
3. 422 with `DATE_RANGE_INVALID` or `DATE_RANGE_TOO_WIDE` error code on validation failure
4. `resolveDateRange()` for default date values
5. `prisma.$queryRaw` with `Prisma.sql` template literals only — never `$queryRawUnsafe`
6. `Cache-Control: no-store` header on ALL responses (including error responses)

**`volume-by-category/route.ts`:**
- `SELECT date_trunc(interval, created_at), c.id, c.name, COUNT(*)` grouped by period + category
- Returns `Array<{ period, category_id, category_name, count }>`

**`volume-by-department/route.ts`:**
- LEFT JOIN Department with `COALESCE(d.id, 'unassigned')` for unassigned tickets
- Returns `Array<{ period, department_id, department_name, count }>`

**`status-breakdown/route.ts`:**
- `GROUP BY status` count query within date range
- Returns `{ open, in_progress, closed, archived }` counts (0 if no rows for that status)

**`resolution-time/route.ts`:**
- CTE `closed_times`: first `TicketHistory` entry where `action = 'STATUS_CHANGE' AND to_value = 'closed'` per ticket
- CTE `resolution`: `EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600` hours per ticket
- Final query: `AVG(hours)` + `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours)` for median
- Branches on `group_by=category|department` with appropriate JOINs
- Returns `Array<{ group_id, group_name, mean_hours, median_hours, count }>`

**`geo-density/route.ts`:**
- `WHERE lat IS NOT NULL AND lng IS NOT NULL` — only geolocated tickets
- Status filter uses Prisma.sql fragment composition: `open` → `IN ('open','in_progress')`, `closed` → `IN ('closed','archived')`, `all` → no filter
- `LIMIT 5000` cap to prevent overloading the map
- GeoJSON coordinates: `[t.lng, t.lat]` per RFC 7946
- Returns `FeatureCollection<Point, { ticket_id, status, category_name, address_snippet }>`

## Decisions Made

1. **Prisma.sql fragment composition for geo-density status filter**: The `status` query param is Zod-validated to `'open' | 'closed' | 'all'` before reaching the filter. Each value selects a pre-built `Prisma.sql` literal — the user-supplied string never touches SQL text, satisfying T-07-03.

2. **COALESCE for unassigned department**: Volume-by-department uses `COALESCE(d.id, 'unassigned')` and `COALESCE(d.name, '(Unassigned)')` so tickets with no department are included in results rather than being silently dropped by an INNER JOIN.

3. **TypeScript type annotation for department rows**: Changed `string | null` to `string` in the `$queryRaw` type parameter since `COALESCE` guarantees non-null at the SQL level. This resolved a TypeScript error at the `shapeVolumeRows` call site.

4. **vitest.config.ts added**: No vitest configuration existed in the project. The config establishes the `@/` path alias (matching tsconfig.json) so unit tests can import from `@/lib/reports` and `@/schemas/reports` without path resolution failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest not installed**
- **Found during:** Task 1 verification
- **Issue:** `vitest ^2.1.0` was in `devDependencies` in package.json but the package was not installed in `node_modules/`
- **Fix:** `npm install --save-dev vitest`
- **Files modified:** package.json (lock file updated)
- **Commit:** 9cc60562

**2. [Rule 1 - Bug] TypeScript error in volume-by-department row type**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `$queryRaw<Array<{ id: string | null }>>` was not assignable to `shapeVolumeRows` parameter which expects `{ id: string }`; COALESCE makes the column non-null but TypeScript doesn't infer that
- **Fix:** Changed type annotation to `{ id: string; name: string }` (non-nullable) matching the SQL guarantee
- **Files modified:** app/api/staff/reports/volume-by-department/route.ts
- **Commit:** ceb2fc64

## Self-Check: PASSED

All 9 artifact files confirmed present:
- `schemas/reports.ts` ✓
- `lib/reports.ts` ✓
- `__tests__/reports.test.ts` ✓
- `vitest.config.ts` ✓
- `app/api/staff/reports/volume-by-category/route.ts` ✓
- `app/api/staff/reports/volume-by-department/route.ts` ✓
- `app/api/staff/reports/status-breakdown/route.ts` ✓
- `app/api/staff/reports/resolution-time/route.ts` ✓
- `app/api/staff/reports/geo-density/route.ts` ✓

Both commits verified in git log:
- `9cc60562` — feat(07-01): shared report Zod schemas, query helpers, and Vitest unit tests
- `ceb2fc64` — feat(07-01): five staff report API route handlers with auth, validation, and no-store cache

No `$queryRawUnsafe` in any report route (`grep` clean).
All five routes: `requireSession` present, `no-store` header present.
GeoJSON coordinates: `[t.lng, t.lat]` confirmed.
TypeScript: 0 errors in report files (`npx tsc --noEmit` — only pre-existing admin route errors in scope of prior phases).
Vitest: 11/11 tests passing.

**E2E tests (live HTTP verification): deferred to verify phase.**
