---
phase: 07-reports-metrics-dashboard
plan: "02"
subsystem: reports-dashboard-ui
tags: [reports, recharts, leaflet, dashboard, e2e, next15]
dependency_graph:
  requires:
    - 07-01: 5 report API routes (volume-by-category, status-breakdown, resolution-time, geo-density, volume-by-department)
  provides:
    - app/staff/reports/page.tsx: Server component dashboard shell at /staff/reports
    - components/reports/DensityMap.tsx: Leaflet MarkerCluster density map (dynamic ssr:false)
    - e2e/staff-reports.spec.ts: Playwright E2E coverage for reports dashboard
  affects:
    - components/ui/button.tsx: New shadcn-compatible Button primitive
    - components/ui/card.tsx: New shadcn-compatible Card primitive
    - lib/utils.ts: New cn() class merge utility
tech_stack:
  added:
    - recharts@^2.12.0 (already in package.json — no install needed)
    - leaflet.markercluster@^1.5.3 (already in package.json)
    - class-variance-authority (buttonVariants)
  patterns:
    - Next.js 15 async searchParams in server components
    - dynamic(ssr:false) for Leaflet components
    - useEffect + fetch + cache:no-store for client-side data freshness
    - recharts ResponsiveContainer for adaptive chart sizing
key_files:
  created:
    - app/staff/reports/page.tsx
    - components/reports/DateRangePicker.tsx
    - components/reports/SummaryCards.tsx
    - components/reports/VolumeChart.tsx
    - components/reports/StatusBreakdown.tsx
    - components/reports/ResolutionTimeChart.tsx
    - components/reports/DensityMap.tsx
    - e2e/staff-reports.spec.ts
    - components/ui/button.tsx
    - components/ui/card.tsx
    - lib/utils.ts
  modified: []
decisions:
  - Reports page uses async searchParams (Next.js 15 Promise pattern) — required for App Router server components
  - DensityMap wrapped in dynamic(ssr:false) in page.tsx — Leaflet accesses window at init, SSR would throw
  - escapeHtml helper added to DensityMap for address_snippet popup content — constituent-supplied text treated as untrusted (T-07-10)
  - components/ui/button + card created as minimal shadcn-compatible primitives — no shadcn CLI or components.json existed; Rule 3 auto-fix for blocking TS2307 errors
  - lib/utils.ts cn() helper created — required by shadcn-compatible components
metrics:
  duration: "8min"
  completed_date: "2026-07-09"
  tasks: 2
  files_created: 11
  files_modified: 0
---

# Phase 7 Plan 02: Reports Dashboard UI Summary

**One-liner:** Recharts + Leaflet MarkerCluster reports dashboard with date-range URL sync, 4 KPI cards, 3 charts, density map (ssr:false), and 7 Playwright E2E tests.

## What Was Built

### `/staff/reports` Page Shell (`app/staff/reports/page.tsx`)
- Server component that `await`s `searchParams` (Next.js 15 async pattern)
- Resolves date range from `preset` (7d/30d/90d) or explicit `startDate`/`endDate` URL params; default: 30d
- Wraps `DensityMap` in `dynamic(() => import(...), { ssr: false })` to prevent Leaflet SSR mismatch
- Passes computed ISO strings down to all client chart components

### `DateRangePicker` (`components/reports/DateRangePicker.tsx`)
- `'use client'` — preset buttons update URL via `router.push` (triggers server re-render)
- Three preset buttons: Last 7d / Last 30d / Last 90d with `data-testid="preset-{value}"` for E2E
- Custom date inputs for arbitrary ranges; applies via `applyCustomRange(start, end)`

### `SummaryCards` (`components/reports/SummaryCards.tsx`)
- `'use client'` — fetches `/api/staff/reports/status-breakdown` + `/api/staff/reports/resolution-time`
- Renders 4 shadcn Card KPIs: Total Tickets, Open, Closed, Avg Resolution (weighted mean across categories)
- All fetches use `{ cache: 'no-store' }` for live data

### Chart Components
- **`VolumeChart`**: recharts `BarChart` stacked by category, pivots flat rows into period-keyed chart data
- **`StatusBreakdown`**: recharts `PieChart` with 4 segments; clicking a segment navigates to `/staff/tickets?status=X`
- **`ResolutionTimeChart`**: recharts horizontal `BarChart` with mean + median bars by department

### `DensityMap` (`components/reports/DensityMap.tsx`)
- `'use client'` + `dynamic(ssr:false)` in page.tsx — no SSR hydration mismatch
- Uses `leaflet.markerClusterGroup()` with graceful layerGroup fallback
- GeoJSON `[lng, lat]` coordinates correctly swapped to `[lat, lng]` for `L.marker()`
- `escapeHtml()` helper sanitizes `address_snippet` (constituent-supplied) before Leaflet popup HTML interpolation
- CDN marker icon URLs (same pattern as `PublicMap.tsx`)

### Playwright E2E (`e2e/staff-reports.spec.ts`)
- 7 tests: unauthenticated redirect, dashboard load + KPI cards, 7d preset URL change, VolumeChart visible, StatusBreakdown visible, ResolutionTimeChart visible, DensityMap no SSR errors
- Tests written; execution deferred to verify phase.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created shadcn-compatible UI primitives**
- **Found during:** Task 1 — `components/ui/button` and `components/ui/card` import paths resolved to missing modules (TS2307)
- **Issue:** The plan referenced `@/components/ui/button` and `@/components/ui/card` but no shadcn components had been generated in previous phases. No `components.json` existed and no other component in the project used shadcn UI.
- **Fix:** Created minimal shadcn-compatible `components/ui/button.tsx` (with `cva` variants) and `components/ui/card.tsx` (Card, CardHeader, CardTitle, CardContent, etc.) plus `lib/utils.ts` with `cn()` helper.
- **Files modified:** `components/ui/button.tsx`, `components/ui/card.tsx`, `lib/utils.ts`
- **Commit:** 9c9251ed

## Contracts Verified

- ✅ `app/api/staff/reports/volume-by-category/route.ts` — GET exported
- ✅ `app/api/staff/reports/status-breakdown/route.ts` — GET exported
- ✅ `app/api/staff/reports/resolution-time/route.ts` — GET exported
- ✅ `app/api/staff/reports/geo-density/route.ts` — GET exported
- ✅ `schemas/reports.ts` — DateRangeSchema exported

## Self-Check

### Files exist
- ✅ `app/staff/reports/page.tsx`
- ✅ `components/reports/DateRangePicker.tsx`
- ✅ `components/reports/SummaryCards.tsx`
- ✅ `components/reports/VolumeChart.tsx`
- ✅ `components/reports/StatusBreakdown.tsx`
- ✅ `components/reports/ResolutionTimeChart.tsx`
- ✅ `components/reports/DensityMap.tsx`
- ✅ `e2e/staff-reports.spec.ts`

### TypeScript
- ✅ `npx tsc --noEmit` — 0 new errors (pre-existing admin route errors unrelated to this plan)

### Key invariants
- ✅ All client components have `'use client'` directive
- ✅ `dynamic(ssr:false)` in page.tsx for DensityMap
- ✅ All fetches use `{ cache: 'no-store' }`
- ✅ 6 cache:no-store calls across components/reports/
- ✅ Coordinate swap `[lng, lat]` → `[lat, lng]` in DensityMap
- ✅ `escapeHtml()` applied to constituent-supplied address_snippet (T-07-10)

## Self-Check: PASSED
