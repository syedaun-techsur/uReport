---
phase: 07-reports-metrics-dashboard
plan: "03"
subsystem: api
tags: [csv, vitest, reports, nextjs, typescript]

# Dependency graph
requires:
  - phase: 07-reports-metrics-dashboard
    plan: "01"
    provides: DateRangeSchema, resolveDateRange, requireSession auth pattern
  - phase: 07-reports-metrics-dashboard
    plan: "02"
    provides: app/staff/reports/page.tsx dashboard page to host the export button
provides:
  - lib/reports/csv.ts — pure RFC-4180 CSV serializer (escapeCsvField + toCsv)
  - __tests__/reports-csv.test.ts — 7 Vitest unit tests covering all escaping edge cases
  - app/api/staff/reports/export/route.ts — staff-gated GET endpoint returning text/csv attachment
  - app/staff/reports/page.tsx — "Export CSV" anchor next to DateRangePicker
affects:
  - verify-work (phase 7 E2E — export button visible on /staff/reports)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure serializer pattern: no I/O, no DB, fully unit-testable — pass to API route via import"
    - "Plain <a> (not next/link) for browser-native file download trigger"
    - "Report route pattern: requireSession → DateRangeSchema → resolveDateRange → $queryRaw → toCsv → NextResponse text/csv"

key-files:
  created:
    - lib/reports/csv.ts — escapeCsvField + toCsv pure RFC-4180 serializer
    - __tests__/reports-csv.test.ts — 7 Vitest unit tests (all passing)
    - app/api/staff/reports/export/route.ts — GET /api/staff/reports/export (staff-gated CSV export)
  modified:
    - app/staff/reports/page.tsx — added Export CSV anchor next to DateRangePicker

key-decisions:
  - "Plain <a> anchor (not next/link) — browser-native download triggered by href navigation; next/link intercepts and routes client-side, preventing download"
  - "toCsv is a pure function with no imports — maximally testable without any mocking"

patterns-established:
  - "CSV export pattern: pure serializer module imported by API route; tested independently from HTTP layer"

# Metrics
duration: 2min
completed: 2026-08-09
---

# Phase 7 Plan 03: CSV Export Summary

**Pure RFC-4180 CSV serializer with 7 Vitest unit tests, staff-gated GET /api/staff/reports/export returning text/csv attachment, and Export CSV anchor on /staff/reports**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-08-09T23:26:42Z
- **Completed:** 2026-08-09T23:28:35Z
- **Tasks:** 3 completed
- **Files modified:** 4 (3 created, 1 edited)

## Accomplishments

- `lib/reports/csv.ts`: pure `escapeCsvField` + `toCsv` functions — zero imports, fully unit-testable, RFC-4180 compliant (commas/double-quotes/newlines trigger quote-wrapping; null/undefined → empty; rows joined with CRLF; trailing CRLF)
- `__tests__/reports-csv.test.ts`: 7 Vitest tests covering simple values, null/undefined, comma-wrapping, double-quote doubling, newline-wrapping, full CRLF serialization, and empty row set — all passing
- `app/api/staff/reports/export/route.ts`: GET route guarded by `requireSession('staff')`, validated with `DateRangeSchema`, resolved with `resolveDateRange`, querying tickets (+ Category/Department joins), serialized with `toCsv`, returning `text/csv; charset=utf-8` with `Content-Disposition: attachment` filename
- `app/staff/reports/page.tsx`: Export CSV anchor added next to DateRangePicker, using plain `<a>` for native browser download; href includes `start_date`/`end_date` from current URL params; `data-testid="export-csv"` for test targeting

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure CSV serializer + Vitest unit tests** - `8c4e05f` (feat)
2. **Task 2: Staff-gated CSV export API route** - `038184a` (feat)
3. **Task 3: Export CSV button on the reports dashboard** - `63ae713` (feat)

**Plan metadata:** (upcoming docs commit)

## Files Created/Modified

- `lib/reports/csv.ts` — Pure RFC-4180 CSV serializer: `escapeCsvField`, `toCsv`, `CsvCell` type
- `__tests__/reports-csv.test.ts` — 7 Vitest unit tests for all escaping edge cases (7/7 passing)
- `app/api/staff/reports/export/route.ts` — GET handler: staff auth, date range validation, $queryRaw tickets + joins, toCsv, text/csv attachment response
- `app/staff/reports/page.tsx` — Export CSV `<a>` anchor added to header row next to DateRangePicker

## Decisions Made

- Used plain `<a>` (not `next/link`) for the export button — `next/link` performs client-side navigation which would not trigger the browser's file download; `<a href="...">` makes the browser treat the response as a file download based on `Content-Disposition: attachment`
- `toCsv` has zero imports — the serializer is maximally testable without any mocking infrastructure, which is the primary quality gate for this plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all implementation matched the plan design intent. The Prisma schema confirmed `Category` and `Department` use `@@map("Category")` and `@@map("Department")` respectively, matching the raw SQL table names used in the export route's JOINs.

## User Setup Required

None - no external service configuration required. The export route reuses the existing Postgres compose service, Auth.js session infrastructure, and the report primitives from 07-01.

## Next Phase Readiness

- All success criteria met: CSV serializer is pure and tested; export route is staff-gated, date-range validated, and returns correct CSV content-type; dashboard has Export CSV button wired to route
- `npm test -- reports-csv` → 7/7 green
- `npx tsc --noEmit` → 0 errors
- Phase 7 (07-01 + 07-02 + 07-03) complete — Reports & Metrics Dashboard fully implemented including CSV export
- Milestone v1.0 complete — all deliverables shipped

## Known Stubs

None — no TODO/FIXME/placeholder found in created or modified files.

---

## Self-Check: PASSED

- `lib/reports/csv.ts` → EXISTS ✓
- `__tests__/reports-csv.test.ts` → EXISTS ✓
- `app/api/staff/reports/export/route.ts` → EXISTS ✓
- `app/staff/reports/page.tsx` (export link present) → VERIFIED ✓
- Commits: `8c4e05f`, `038184a`, `63ae713` → all in git log ✓
- Build check: `npx tsc --noEmit` → exit 0 ✓
- Unit tests: `npm test -- reports-csv` → 7/7 passing ✓
- No blocking stubs found ✓

---
*Phase: 07-reports-metrics-dashboard*
*Completed: 2026-08-09*
