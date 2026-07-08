---
phase: 03-public-portal-constituent-tracking
plan: "01"
subsystem: ui
tags: [leaflet, react-leaflet, nominatim, zod, next.js, public-portal, category-picker]

# Dependency graph
requires:
  - phase: 01-k8s-scaffold-data-foundation
    provides: Prisma schema with Category, CategoryGroup, Department models and seeded data
provides:
  - Public portal home page at / with Leaflet map and report form
  - GET /api/categories endpoint returning CategoryRecord[] with group_name
  - CreateTicketSchema Zod definition for ticket submission validation
  - CategoryRecord and MediaRecord TypeScript interfaces (extended with group_name)
  - ReportingMap component with pin-drop and Nominatim address search
affects:
  - 03-02 (photo upload, confirmation page — uses CreateTicketSchema and /api/categories)
  - 03-03 (ticket lookup, public map — uses CategoryRecord type)

# Tech tracking
tech-stack:
  added: [leaflet, react-leaflet, @types/leaflet already in deps]
  patterns:
    - dynamic import with ssr:false for Leaflet components (window access at init)
    - Nominatim forward/reverse geocode with User-Agent header per OSM policy
    - Route group (public) for public-facing pages without auth middleware
    - Cache-Control: public, max-age=60 on category list endpoint

key-files:
  created:
    - app/(public)/page.tsx
    - app/(public)/layout.tsx
    - components/maps/ReportingMap.tsx
    - app/api/categories/route.ts
    - schemas/ticket.ts
    - e2e/public-portal.spec.ts
  modified:
    - types/domain.ts (added group_name?: string | null to CategoryRecord)
    - app/page.tsx (removed — placeholder replaced by (public)/page.tsx)

key-decisions:
  - "Remove app/page.tsx placeholder — (public)/page.tsx serves same / route; both cannot coexist"
  - "Add group_name to CategoryRecord — avoids separate CategoryGroup API call from frontend picker"
  - "ReportingMap uses named + default export — named for type-safe imports, default for dynamic()"
  - "Leaflet icon fix via unpkg CDN URLs — simplest approach for SSR-safe icon paths in Next.js"

patterns-established:
  - "Client-side Leaflet always dynamic-imported with ssr:false from server/shared components"
  - "Nominatim requests include User-Agent: uReport-NG per OSM API usage policy"
  - "Public API endpoints return Cache-Control: public, max-age=60 to reduce DB load"

# Metrics
duration: 5min
completed: 2026-07-08
---

# Phase 3 Plan 01: Public Portal — Report Form Summary

**Leaflet map with Nominatim geocoding, grouped category picker, anon/required contact logic, and GET /api/categories endpoint returning 6 seeded categories**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-07-08T14:09:59Z
- **Completed:** 2026-07-08T14:14:50Z
- **Tasks:** 2
- **Files modified:** 7 (6 created, 1 modified, 1 deleted)

## Accomplishments

- `GET /api/categories` returns 6 seeded categories with group names via Prisma join to CategoryGroup and Department
- `components/maps/ReportingMap.tsx` provides Leaflet pin-drop map with Nominatim reverse geocode on click, forward geocode address search with 300ms debounce, dropdown results, fly-to on selection
- `app/(public)/page.tsx` full constituent report form: dynamic ReportingMap (ssr:false), grouped `<optgroup>` category picker, description textarea, contact fields with anon/required logic, photo file input, client-side validation
- `schemas/ticket.ts` exports `CreateTicketSchema` matching TechArch §4.2 exactly
- 6 Playwright E2E tests written covering all success criteria (deferred to verify phase for execution)

## Task Commits

Each task was committed atomically:

1. **Task 1: Categories API, domain types, and Zod schema** - `3c9b961` (feat)
2. **Task 2: ReportingMap component, public portal page, and E2E tests** - `9076767` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `types/domain.ts` — Added `group_name?: string | null` to `CategoryRecord` interface
- `schemas/ticket.ts` — `CreateTicketSchema` with lat/lng/address/category_id/description/name/email/phone
- `app/api/categories/route.ts` — `GET` handler; Prisma query joins Category→CategoryGroup+Department; returns `CategoryRecord[]` with `Cache-Control: public, max-age=60`
- `components/maps/ReportingMap.tsx` — `'use client'` Leaflet map; Nominatim reverse geocode on click; forward geocode address search with debounce; User-Agent header; L.Icon.Default fix for Next.js
- `app/(public)/layout.tsx` — Minimal passthrough layout for public route group
- `app/(public)/page.tsx` — Full constituent report form with dynamic ReportingMap (ssr:false), grouped category picker, description, contact fields, photo input, form validation
- `app/page.tsx` — Removed (placeholder replaced by `(public)/page.tsx`)
- `e2e/public-portal.spec.ts` — 6 Playwright E2E tests

## Decisions Made

- **Remove `app/page.tsx` placeholder:** Next.js route groups don't change URL paths so both `app/page.tsx` and `app/(public)/page.tsx` served `/`, causing a conflict. The Phase 1 placeholder was removed.
- **`group_name` in `CategoryRecord`:** The `GET /api/categories` API joins to `CategoryGroup` to include `group_name` in each record, avoiding a separate API call from the frontend. The `CategoryRecord` interface was extended with `group_name?: string | null`.
- **Named + default export for ReportingMap:** `export function ReportingMap` (named) for type-safe imports plus `export default ReportingMap` for `dynamic()` compatibility.
- **Leaflet icon fix via unpkg CDN:** `L.Icon.Default.mergeOptions({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/...' })` is the simplest SSR-safe approach — avoids webpack file-loader configuration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed conflicting `app/page.tsx` placeholder**
- **Found during:** Task 2 (creating `app/(public)/page.tsx`)
- **Issue:** Both `app/page.tsx` and `app/(public)/page.tsx` map to `/` — Next.js cannot serve two pages for the same route
- **Fix:** Removed `app/page.tsx` (Phase 1 placeholder explicitly noted "Full implementation in Phase 3")
- **Files modified:** `app/page.tsx` (deleted)
- **Verification:** `curl http://localhost:3000/` returns "Report a Municipal Issue" — new page serving correctly
- **Committed in:** `9076767` (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added `group_name` field to `CategoryRecord` and API response**
- **Found during:** Task 2 (implementing grouped `<optgroup>` category picker)
- **Issue:** Plan noted that `GET /api/categories` returns `CategoryRecord[]` without `group_name`, but the picker needs group names for `<optgroup label>`. Plan ultimately says to include `group_name` — implementing it.
- **Fix:** Extended `CategoryRecord` with `group_name?: string | null`; updated `app/api/categories/route.ts` to join `CategoryGroup`
- **Files modified:** `types/domain.ts`, `app/api/categories/route.ts`
- **Verification:** API returns `group_name` field for each category
- **Committed in:** `3c9b961` (Task 1 commit) and `9076767` (Task 2 commit)

**3. [Rule 3 - Blocking] Ran DB migrations and seed before API verification**
- **Found during:** Verification of `GET /api/categories`
- **Issue:** Migrations had not been applied; Prisma returned "table does not exist"
- **Fix:** Ran `npx prisma migrate deploy` then `npx tsx prisma/seed.ts`
- **Verification:** `GET /api/categories` returns 6 seeded categories
- **Committed in:** Not committed (runtime state — migrations already tracked via `start-dev.sh`)

---

**Total deviations:** 3 auto-fixed (1 blocking/conflict, 1 missing-critical, 1 blocking/db)
**Impact on plan:** All necessary for correct operation. No scope creep — all changes align with plan intent.

## Issues Encountered

None — all issues resolved via deviation rules.

## User Setup Required

None — no external service configuration required. The app uses the Kubernetes-injected Postgres sidecar.

## Next Phase Readiness

- `CreateTicketSchema` and `CategoryRecord` types ready for plan 03-02 (photo upload + ticket submission)
- `GET /api/categories` endpoint live and serving seeded data
- `ReportingMap` component ready for reuse in plan 03-03 (public map view)
- E2E tests written in `e2e/public-portal.spec.ts`; run by verify phase

---
*Phase: 03-public-portal-constituent-tracking*
*Completed: 2026-07-08*

## Self-Check: PASSED

- ✅ `app/(public)/page.tsx` — FOUND
- ✅ `app/(public)/layout.tsx` — FOUND
- ✅ `components/maps/ReportingMap.tsx` — FOUND
- ✅ `app/api/categories/route.ts` — FOUND
- ✅ `schemas/ticket.ts` — FOUND
- ✅ `types/domain.ts` — FOUND
- ✅ `e2e/public-portal.spec.ts` — FOUND
- ✅ Commit `3c9b961` (Task 1) — FOUND
- ✅ Commit `9076767` (Task 2) — FOUND
