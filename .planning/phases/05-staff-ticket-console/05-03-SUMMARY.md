---
phase: 05-staff-ticket-console
plan: "03"
subsystem: ui
tags: [staff, tickets, leaflet, react-leaflet, history-timeline, media-gallery, playwright]

# Dependency graph
requires:
  - phase: 05-staff-ticket-console
    plan: "01"
    provides: GET /api/staff/tickets (queue API), requireSession pattern, StatusBadge component
  - phase: 03-public-portal-constituent-tracking
    provides: GET /api/media/[id] for media inline rendering, CDN Leaflet icon pattern
provides:
  - GET /api/staff/tickets/[id] — full ticket detail (history + responses + media + persons)
  - app/staff/tickets/[id]/page.tsx — staff ticket detail client page
  - components/tickets/HistoryTimeline — chronological audit timeline with action-type icons
  - components/maps/MiniMap — read-only Leaflet mini-map (ssr:false) for ticket location
  - components/maps/_MiniMapInner — client-side Leaflet inner component
  - components/tickets/MediaGallery — read-only thumbnail grid using /api/media/[id]
  - e2e/staff-ticket-detail.spec.ts — 3 Playwright E2E tests
affects: [STAFF-07, STAFF-08, STAFF-09, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "dynamic(ssr:false) wrapping Leaflet inner component — consistent with PublicMap/ReportingMap pattern"
    - "CDN Leaflet marker icon URLs — avoids Next.js static image import issues (LOCKED)"
    - "Explicit response allowlist in staff detail endpoint — no spread operator (T-05-11 PII-safe)"
    - "requireSession('staff') before any DB access — T-05-12 pattern"
    - "React JSX rendering for staff-entered text — automatic HTML entity escaping (T-05-13)"

key-files:
  created:
    - app/api/staff/tickets/[id]/route.ts
    - app/staff/tickets/[id]/page.tsx
    - components/tickets/HistoryTimeline.tsx
    - components/maps/MiniMap.tsx
    - components/maps/_MiniMapInner.tsx
    - components/tickets/MediaGallery.tsx
    - e2e/staff-ticket-detail.spec.ts
  modified: []

key-decisions:
  - "MiniMap splits into MiniMap.tsx (dynamic wrapper) + _MiniMapInner.tsx (actual Leaflet) — required for ssr:false to work with react-leaflet"
  - "E2E test uses 'identifier' aria-label + Staff1234!secure — consistent with staff-queue.spec.ts convention"
  - "MediaGallery add-media-btn hidden/disabled placeholder — 05-04 activates upload functionality"
  - "Detail page as client component using useEffect fetch — MiniMap requires 'use client'"

patterns-established:
  - "MiniMap pattern: MiniMap.tsx → dynamic import → _MiniMapInner.tsx (ssr:false boundary)"
  - "HistoryTimeline action icons: ArrowRightLeft/UserCheck/MessageSquare/Paperclip/Tag/Clock from lucide-react"

# Metrics
duration: 2min
completed: 2026-07-08
---

# Phase 5 Plan 3: Staff Ticket Detail Page Summary

**Staff ticket detail page with full audit history timeline, read-only Leaflet mini-map (ssr:false), media gallery, and GET /api/staff/tickets/[id] returning all relations in one Prisma query**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-08T20:05:59Z
- **Completed:** 2026-07-08T20:08:53Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `GET /api/staff/tickets/[id]` with full includes (category, dept, substatus, assignee, history, responses, media, persons) — auth-gated by `requireSession('staff')`, explicit allowlist response
- `MiniMap` component using `dynamic(ssr:false)` + CDN Leaflet icon URLs (LOCKED decisions) — split into wrapper + `_MiniMapInner` for SSR boundary
- `HistoryTimeline` with 6 action type icons from lucide-react, React JSX rendering (auto-escaped notes, T-05-13)
- `MediaGallery` read-only grid: images inline via `/api/media/[id]`, PDFs as download links; hidden add-media-btn placeholder for 05-04
- Staff ticket detail page: client component fetching ticket data, rendering all sections + action-panel placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /api/staff/tickets/[id] full detail route handler** - `0be882b` (feat)
2. **Task 2: HistoryTimeline + MiniMap + MediaGallery + detail page + Playwright E2E** - `5385b25` (feat)

**Plan metadata:** TBD (docs commit)

_Note: E2E tests written; execution deferred to verify phase._

## Files Created/Modified

- `app/api/staff/tickets/[id]/route.ts` — GET /api/staff/tickets/[id] with full Prisma includes, requireSession('staff'), explicit allowlist response
- `app/staff/tickets/[id]/page.tsx` — Staff detail client page: fetch + header + mini-map + history + media + action panel placeholder
- `components/tickets/HistoryTimeline.tsx` — Vertical timeline with action-type icons (6 types), note rendering, formatted timestamps
- `components/maps/MiniMap.tsx` — dynamic(ssr:false) wrapper component
- `components/maps/_MiniMapInner.tsx` — Actual react-leaflet MapContainer with CDN icons, client-side only
- `components/tickets/MediaGallery.tsx` — Read-only image/file grid with hidden add-media-btn placeholder
- `e2e/staff-ticket-detail.spec.ts` — 3 Playwright tests: page loads, history visible, Leaflet map renders

## Decisions Made

- Split MiniMap into wrapper (`MiniMap.tsx`) + inner (`_MiniMapInner.tsx`) — `dynamic(ssr:false)` must wrap the file importing Leaflet/react-leaflet, not just the JSX
- E2E tests use `aria-label` selectors and `Staff1234!secure` credential — consistent with staff-queue.spec.ts pattern established in 05-01
- `MediaGallery` `add-media-btn` is hidden (`hidden` class) and `disabled` — placeholder for 05-04 upload; not shown in current UI
- Detail page as `'use client'` with `useEffect` fetch — MiniMap requires client context; server component + client component combo would add complexity without benefit

## Deviations from Plan

None - plan executed exactly as written.

The plan specified the exact implementation including the two-file MiniMap split (MiniMap.tsx + _MiniMapInner.tsx), the CDN icon pattern, and the E2E test structure. All tasks followed the plan specification.

## Issues Encountered

None — TypeScript compiled with 0 errors for all new files. All integration contracts verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ticket detail page complete: GET API + UI (header, map, history, media)
- `data-testid="action-panel"` placeholder ready for 05-04 mutations
- `data-testid="add-media-btn"` hidden button ready for 05-04 media upload activation
- E2E tests written; execution deferred to verify phase
- Enables STAFF-07, STAFF-08, STAFF-09: mutations in plan 05-04 extend this page

## Self-Check: PASSED

All 7 key files verified on disk. Both task commits (0be882b, 5385b25) confirmed in git log.

---
*Phase: 05-staff-ticket-console*
*Completed: 2026-07-08*
