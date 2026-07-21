---
phase: 07-reports-metrics-dashboard
plan: "01"
subsystem: api
tags: [prisma, zod, reports, geojson, vitest, nextjs]

# Dependency graph
requires:
  - phase: 01-k8s-scaffold-data-foundation
    provides: Prisma schema — Ticket, TicketHistory, Category, Department models
  - phase: 02-authentication-sessions
    provides: requireSession auth guard in lib/api-response.ts
provides:
  - Five staff-authenticated report GET endpoints under /api/staff/reports/
  - Shared Zod validation schemas in schemas/reports.ts
  - Pure query helper library in lib/reports.ts
  - Vitest unit tests covering date parsing and result shaping
affects:
  - 07-02-dashboard (consumes all five endpoints for the metrics UI)

# Tech tracking
tech-stack:
  added: [vitest (unit tests), @prisma/client/runtime/library (raw/sqltag/empty)]
  patterns:
    - Prisma.$queryRaw with parameterized Date values (never $queryRawUnsafe)
    - Prisma.raw() fragment for SQL expressions that must appear identically in SELECT + GROUP BY
    - Zod refine() chains for multi-field cross-validation (date ordering + range width)
    - GeoJSON FeatureCollection shape with RFC 7946 [lng, lat] coordinate order
    - Cache-Control no-store on all aggregation responses

key-files:
  created:
    - schemas/reports.ts — DateRangeSchema, VolumeQuerySchema, ResolutionQuerySchema, GeoDensityQuerySchema
    - lib/reports.ts — resolveDateRange, shapeVolumeRows, shapeResolutionRows
    - __tests__/reports.test.ts — 11 Vitest unit tests
    - app/api/staff/reports/volume-by-category/route.ts — time-series volume by category
    - app/api/staff/reports/volume-by-department/route.ts — time-series volume by department
    - app/api/staff/reports/status-breakdown/route.ts — open/in_progress/closed/archived counts
    - app/api/staff/reports/resolution-time/route.ts — mean/median hours via PERCENTILE_CONT(0.5)
    - app/api/staff/reports/geo-density/route.ts — GeoJSON FeatureCollection for density map
  modified: []

key-decisions:
  - "Prisma.raw() fragment (not bound parameter) for date_trunc interval — identical fragment in SELECT and GROUP BY required to avoid Postgres 42803 error; safe from injection as interval is a z.enum-validated literal"
  - "Prisma.sql/Prisma.Sql → sql (sqltag alias) + Sql + empty from @prisma/client/runtime/library — Prisma v6 removed these from the Prisma namespace; runtime/library exports them directly"
  - "COALESCE(d.id, 'unassigned') in volume-by-department — NULL departments grouped under synthetic id for consistent response shape"
  - "empty sentinel for no-status-filter in geo-density — avoids empty template literal that TypeScript rejects"
  - "TicketRow type alias for explicit typing in geo-density tickets.map() — resolves TS7006 implicit any"
  - "PERCENTILE_CONT(0.5) in CTE for resolution-time median — standard Postgres ordered-set aggregate"
  - "GeoJSON coordinates [lng, lat] per RFC 7946 — not [lat, lng]"

patterns-established:
  - "Report route pattern: requireSession('staff') → Zod parse → resolveDateRange → $queryRaw → shape → NextResponse with Cache-Control: no-store"
  - "Error code detection from Zod message text: msg.includes('366') → DATE_RANGE_TOO_WIDE else DATE_RANGE_INVALID"
  - "Sql fragment composition: sql template tag for static IN clauses; empty for no-op SQL fragments"

# Metrics
duration: 10min
completed: 2026-07-21
---

# Phase 7 Plan 01: Report API Routes Summary

**Five staff-authenticated Prisma.$queryRaw report endpoints with Zod date validation, GeoJSON output, and Cache-Control: no-store — data layer for the metrics dashboard**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-21T20:16:18Z
- **Completed:** 2026-07-21T20:18:51Z
- **Tasks:** 2 completed
- **Files modified:** 8 (3 schemas/helpers/tests created, 5 route handlers — 3 required TypeScript fixes)

## Accomplishments

- Shared Zod schemas (`schemas/reports.ts`) with DateRangeSchema cross-field refinements rejecting start > end and ranges > 366 days
- Pure query helper library (`lib/reports.ts`) with resolveDateRange, shapeVolumeRows, shapeResolutionRows (bigint→number coercion)
- Five route handlers each guarded by `requireSession('staff')`, returning `Cache-Control: no-store` on every response
- Resolution-time endpoint uses `PERCENTILE_CONT(0.5) WITHIN GROUP` for statistically correct median hours
- GeoJSON FeatureCollection from geo-density with RFC 7946 coordinate order `[lng, lat]` and address truncated to 80 chars (T-07-04)
- 11 Vitest unit tests covering date defaults, range validation, bigint shaping, and VolumeQuerySchema defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared report Zod schemas and query helpers** - `aa26383` (feat — pre-committed in pivota-auto)
2. **Task 2: Five report API route handlers** - `4149a91` (fix — Prisma v6 API compatibility)

## Files Created/Modified

- `schemas/reports.ts` — DateRangeSchema + VolumeQuerySchema + ResolutionQuerySchema + GeoDensityQuerySchema
- `lib/reports.ts` — resolveDateRange, shapeVolumeRows, shapeResolutionRows pure helpers
- `__tests__/reports.test.ts` — 11 unit tests (all passing)
- `app/api/staff/reports/volume-by-category/route.ts` — time-series volume by category (fixed Prisma.raw → raw)
- `app/api/staff/reports/volume-by-department/route.ts` — time-series volume by department (fixed Prisma.raw → raw)
- `app/api/staff/reports/status-breakdown/route.ts` — open/in_progress/closed/archived counts
- `app/api/staff/reports/resolution-time/route.ts` — mean/median resolution hours by group (CTE + PERCENTILE_CONT)
- `app/api/staff/reports/geo-density/route.ts` — GeoJSON FeatureCollection (fixed Prisma.sql/Prisma.Sql → runtime/library exports)

## Decisions Made

- Used `raw()` from `@prisma/client/runtime/library` instead of `Prisma.raw()` for date_trunc interval expressions — Prisma v6 removed these from the Prisma namespace
- Used `sql` (sqltag alias) and `empty` from `@prisma/client/runtime/library` for geo-density status SQL fragments
- `PERCENTILE_CONT(0.5)` for median hours — standard Postgres ordered-set aggregate, no custom computation needed
- `LIMIT 5000` on geo-density to bound response size (T-07-05)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma v6 API incompatibility — Prisma.raw/Prisma.sql not available on Prisma namespace**
- **Found during:** Task 2 verification (TypeScript compilation check)
- **Issue:** `Prisma.raw()` and `Prisma.sql` do not exist on the `Prisma` namespace in Prisma v6; `Prisma.Sql` type also not exported there. The generated files used Prisma v5-era APIs.
- **Fix:** Imported `raw`, `sqltag as sql`, `Sql`, and `empty` directly from `@prisma/client/runtime/library` in the three affected files (volume-by-category, volume-by-department, geo-density). Also added explicit `TicketRow` type alias to resolve TS7006 implicit-any error in geo-density.
- **Files modified:** `app/api/staff/reports/volume-by-category/route.ts`, `app/api/staff/reports/volume-by-department/route.ts`, `app/api/staff/reports/geo-density/route.ts`
- **Verification:** `npx tsc --noEmit` produces zero errors in reports files; 11 vitest tests pass
- **Committed in:** `4149a91`

---

**Total deviations:** 1 auto-fixed (Rule 1 — Bug)
**Impact on plan:** Fix was necessary for TypeScript compilation correctness. No scope creep. All behavioral contract and security properties (parameterized SQL, requireSession guard, no-store headers, GeoJSON shape) preserved exactly as designed.

## Issues Encountered

None — all implementation matched the plan design intent. The only issue was the Prisma v6 API surface change for `raw`/`sql`/`Sql`, auto-fixed under Rule 1.

## User Setup Required

None - no external service configuration required. All endpoints use the existing Postgres compose service and Auth.js session infrastructure.

## Next Phase Readiness

- All five endpoints verified: exports, auth guard, Cache-Control, Zod validation, no queryRawUnsafe
- All 11 unit tests passing
- No TypeScript errors in reports files
- Ready for 07-02: Dashboard page that consumes all five endpoints

---
*Phase: 07-reports-metrics-dashboard*
*Completed: 2026-07-21*
