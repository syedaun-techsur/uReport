---
phase: 05-staff-ticket-console
plan: "01"
subsystem: api
tags: [staff, tickets, fts, tsvector, tanstack-table, playwright, zod, prisma]

# Dependency graph
requires:
  - phase: 01-k8s-scaffold-data-foundation
    provides: Ticket/Category/Department/Substatus/User Prisma models + search_vector tsvector column
  - phase: 02-authentication-sessions
    provides: requireSession() auth guard + Auth.js session management
  - phase: 03-public-portal-constituent-tracking
    provides: TicketSummary type, PaginationMeta type, api-response.ts helpers
provides:
  - GET /api/staff/tickets — paginated, filtered, FTS-searchable ticket queue
  - lib/fts.ts — buildFtsQuery + ticketFtsWhere using Prisma.sql
  - schemas/ticket.ts — TicketQueueQuerySchema (extends existing CreateTicketSchema)
  - components/tickets/StatusBadge — color-coded status badge
  - components/tickets/FilterPanel — URL-synced filter panel
  - components/tickets/TicketTable — TanStack Table with row navigation
  - app/staff/tickets/page.tsx — staff queue page (replaced placeholder)
  - GET /api/staff/departments — for filter dropdown population
  - e2e/staff-queue.spec.ts — 4 Playwright E2E tests
affects: [STAFF-04, STAFF-05, STAFF-06, STAFF-07, STAFF-08, STAFF-09, STAFF-10, STAFF-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma.sql template literals for all FTS/raw SQL queries (T-05-02 SQL injection prevention)"
    - "Explicit allowlist response construction — no spread operator (T-05-03 PII-safe pattern)"
    - "URL search params as single source of truth for filter state (bookmarkable/shareable)"
    - "Suspense boundary wrapping useSearchParams() usage in Next.js page components"
    - "300ms debounce on FTS search input to avoid per-keystroke API calls"

key-files:
  created:
    - app/api/staff/tickets/route.ts
    - app/api/staff/departments/route.ts
    - lib/fts.ts
    - components/tickets/StatusBadge.tsx
    - components/tickets/FilterPanel.tsx
    - components/tickets/TicketTable.tsx
    - e2e/staff-queue.spec.ts
  modified:
    - schemas/ticket.ts
    - app/staff/tickets/page.tsx

key-decisions:
  - "FTS path uses prisma.$queryRaw with Prisma.sql template literals — $queryRawUnsafe explicitly forbidden in lib/fts.ts comments"
  - "Status enum cast as '::\"TicketStatus\"' in raw SQL to match Postgres custom enum type"
  - "Departments endpoint placed at /api/staff/departments (auth required) not public — staff-only data"
  - "E2E tests use 'identifier' field (not 'username') matching actual login form and STAFF_PASSWORD=Staff1234!secure"
  - "Added GET /api/staff/departments for FilterPanel [Rule 2 - Missing Critical] — filter dropdown required this"

patterns-established:
  - "Filter state URL sync pattern: useSearchParams() + router.push() on every filter change → page re-fetches"
  - "requireSession('staff') check: if ('status' in sessionOrError) return sessionOrError — per account/password/route.ts convention"

# Metrics
duration: 5min
completed: 2026-07-08
---

# Phase 5 Plan 1: Staff Ticket Queue Summary

**Paginated staff ticket queue with Postgres FTS, bbox filtering, and URL-synced filters using Prisma.sql parameterized queries and TanStack Table**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-08T19:52:58Z
- **Completed:** 2026-07-08T19:58:24Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- `GET /api/staff/tickets` route with full filtering, FTS via `plainto_tsquery`, pagination, sort — guarded by `requireSession('staff')`
- `lib/fts.ts` with `buildFtsQuery` + `ticketFtsWhere` using `Prisma.sql` template literals (T-05-02 SQL injection prevention)
- Staff queue UI: `FilterPanel` syncing all filter state to URL params, `TicketTable` (TanStack Table) with row links, `StatusBadge`, full page with pagination
- 4 Playwright E2E tests covering: page load, status filter URL sync, FTS debounce URL sync, sort URL sync

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /api/staff/tickets route handler + lib/fts.ts + schemas/ticket.ts** - `7cd1619` (feat)
2. **Task 2: TicketTable + FilterPanel + StatusBadge UI + Playwright E2E tests** - `2a251f5` (feat)

**Plan metadata:** TBD (docs commit)

_Note: E2E tests written; execution deferred to verify phase._

## Files Created/Modified

- `app/api/staff/tickets/route.ts` — GET handler with FTS path (prisma.$queryRaw) + Prisma path (findMany), all filters, pagination
- `lib/fts.ts` — buildFtsQuery (sanitize) + ticketFtsWhere (Prisma.sql parameterized)
- `schemas/ticket.ts` — extended with TicketQueueQuerySchema (13 validated params)
- `app/staff/tickets/page.tsx` — replaced placeholder with full client component (useSearchParams + fetch)
- `components/tickets/StatusBadge.tsx` — color-coded status + substatus badge
- `components/tickets/FilterPanel.tsx` — category/dept/status/date/FTS/sort controls, all URL-synced with 300ms debounce on FTS
- `components/tickets/TicketTable.tsx` — TanStack Table with 8 columns, row navigation to /staff/tickets/[id]
- `app/api/staff/departments/route.ts` — GET /api/staff/departments for filter dropdown (staff auth required)
- `e2e/staff-queue.spec.ts` — 4 Playwright tests with correct credentials (Staff1234!secure)

## Decisions Made

- Used `Prisma.sql` template literals throughout FTS path — `$queryRawUnsafe` explicitly forbidden in source comments
- Cast status filter as `::\"TicketStatus\"` in raw SQL to match Postgres custom enum type
- Added `GET /api/staff/departments` endpoint to support FilterPanel dropdown (staff-auth gated)
- E2E tests use `identifier` field (not `username`) matching the actual login form input
- Seed password is `Staff1234!secure` (not `Staff@Password1` as plan template suggested) — corrected from actual `prisma/seed.ts`
- `app/staff/tickets/page.tsx` uses `Suspense` wrapper for `useSearchParams()` per Next.js requirement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added GET /api/staff/departments endpoint**
- **Found during:** Task 2 (FilterPanel implementation)
- **Issue:** FilterPanel requires department dropdown data but no `/api/staff/departments` endpoint existed; plan mentioned fetching from this path
- **Fix:** Created `app/api/staff/departments/route.ts` returning `{ data: Department[] }` with staff auth guard
- **Files modified:** `app/api/staff/departments/route.ts` (created)
- **Verification:** TypeScript compiles cleanly; endpoint returns correct shape
- **Committed in:** `2a251f5` (Task 2 commit)

**2. [Rule 1 - Bug] Corrected E2E test credentials**
- **Found during:** Task 2 (E2E test creation)
- **Issue:** Plan template suggests `Staff@Password1` but actual `prisma/seed.ts` hashes `Staff1234!secure`
- **Fix:** E2E test uses `STAFF_PASSWORD ?? 'Staff1234!secure'` matching seed; also uses `identifier` field not `username`
- **Files modified:** `e2e/staff-queue.spec.ts`
- **Verification:** Credential matches seed.ts hash
- **Committed in:** `2a251f5` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed categories API response handling in FilterPanel**
- **Found during:** Task 2 (FilterPanel implementation)
- **Issue:** `/api/categories` returns a bare array but FilterPanel expected `{ data: [...] }` wrapper
- **Fix:** FilterPanel handles both array and `{ data: [...] }` shapes with `Array.isArray()` check
- **Files modified:** `components/tickets/FilterPanel.tsx`
- **Verification:** TypeScript compiles cleanly
- **Committed in:** `2a251f5` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 bugs)
**Impact on plan:** All auto-fixes necessary for correct operation. No scope creep.

## Issues Encountered

None — TypeScript compiled cleanly (0 errors) for all new files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Staff ticket queue complete: FilterPanel + TicketTable + FTS API + URL-synced state
- E2E tests written; execution deferred to verify phase
- Enables STAFF-04 through STAFF-11: bookmark CRUD, ticket detail, mutations all depend on queue page
- Ready for Phase 5 Plan 2 (if any) or Phase 6

## Self-Check: PASSED

All 9 key files verified on disk. Both task commits (7cd1619, 2a251f5) confirmed in git log.

---
*Phase: 05-staff-ticket-console*
*Completed: 2026-07-08*
