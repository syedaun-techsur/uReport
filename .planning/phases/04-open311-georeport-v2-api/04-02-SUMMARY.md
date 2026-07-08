---
phase: 04-open311-georeport-v2-api
plan: "02"
subsystem: api
tags: [open311, georeport-v2, next.js, prisma, rate-limit, api-key-auth, xml, content-negotiation]

# Dependency graph
requires:
  - phase: 04-open311-georeport-v2-api
    plan: "01"
    provides: "lib/open311.ts (ticketToServiceRequest, categoryToService, toXml, parseApiKey, verifyApiKey, wantsXml), schemas/open311.ts, types/open311.ts, lib/rate-limit.ts"
provides:
  - "GET /api/open311/services — list active services as JSON array or XML <services> document"
  - "GET /api/open311/services/{service_code} — single service definition or 404"
  - "POST /api/open311/requests — create service request with write-scoped API key auth (returns 401/403 on auth failure)"
  - "GET /api/open311/requests — paginated list with X-Total-Count/X-Page/X-Page-Size/X-Has-Next-Page headers"
  - "GET /api/open311/requests/{id} — single request wrapped in array per GeoReport v2 spec"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Open311 GeoReport v2 route handler pattern: content negotiation (JSON default, XML on ?format=xml or Accept:application/xml) with inline open311Err() helper"
    - "API key auth before any DB write: parseApiKey() → verifyApiKey() → 401/403 on failure"
    - "Raw JSON array response for GeoReport v2 compliance (no { data: [] } envelope)"
    - "Single-item GET response still wrapped in array per Open311 spec"
    - "Pagination via response headers not response body"

key-files:
  created:
    - app/api/open311/services/route.ts
    - app/api/open311/services/[service_code]/route.ts
    - app/api/open311/requests/route.ts
    - app/api/open311/requests/[service_request_id]/route.ts
  modified: []

key-decisions:
  - "open311Err() helper centralizes JSON/XML error formatting within each route module"
  - "POST /api/open311/requests creates Person+TicketPerson in same $transaction as Ticket when contact info provided"
  - "data.long (Open311 input field) stored as lng in Prisma Ticket model — explicit comment in code documents the mapping"

patterns-established:
  - "Open311 error format: { errors: [{ code, description }] } used for all error responses including 404/422/429/500"
  - "GeoReport v2 single-item response pattern: GET /requests/{id} returns [serviceRequest] array not bare object"

# Metrics
duration: 2min
completed: 2026-07-08
---

# Phase 4 Plan 2: Open311 GeoReport v2 Route Handlers Summary

**Four Next.js 15 App Router route handlers delivering the complete Open311 GeoReport v2 API surface: services list/detail (GET), service requests list with pagination headers (GET), service request creation with API key auth (POST), and single request detail (GET), all with JSON/XML content negotiation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-08T17:22:25Z
- **Completed:** 2026-07-08T17:24:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Implemented all 5 HTTP operations across 4 route handler files under `app/api/open311/`
- Full GeoReport v2 compliance: raw JSON array responses (no envelope), `long` field name (not `lng`), single-item responses wrapped in array, pagination via response headers
- Complete auth policy enforcement: POST requires write-scoped API key (401 on missing, 403 on read-only), GET endpoints rate-limited per IP with 429 + Retry-After
- Content negotiation for all endpoints: JSON default, XML on `?format=xml` or `Accept: application/xml`
- 28 Vitest tests from Plan 04-01 still pass; zero TypeScript errors across all Phase 4 files

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /api/open311/services and GET /api/open311/services/[service_code]** - `b0b433f` (feat)
2. **Task 2: GET+POST /api/open311/requests and GET /api/open311/requests/[service_request_id]** - `c64974a` (feat)

**Plan metadata:** (docs commit — see final_commit below)

## Files Created/Modified

- `app/api/open311/services/route.ts` — GET list of active services as JSON array or XML `<services>` document
- `app/api/open311/services/[service_code]/route.ts` — GET single service by service_code; 404 on not found or inactive
- `app/api/open311/requests/route.ts` — GET paginated service requests (rate-limited) + POST create (API key auth)
- `app/api/open311/requests/[service_request_id]/route.ts` — GET single ticket wrapped in array (rate-limited)

## Decisions Made

- **open311Err() helper** centralizes JSON/XML error response construction within each module — avoids repeating the `if (xml) { toXml... } else { NextResponse.json... }` pattern for errors
- **Person+TicketPerson creation in $transaction** — contact info (if provided) is atomically linked to the new Ticket; no orphaned persons on ticket creation failure
- **data.long → lng mapping comment** — `data.long ?? null` stored as `lng:` in Prisma create call with explicit inline comment documenting the Open311→internal field name difference

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 4 is complete. All Open311 GeoReport v2 endpoints are implemented:
- O311-01 through O311-07 features fully delivered
- Library layer (Plan 04-01) + route handlers (Plan 04-02) together form the complete Open311 API
- Ready for Phase 5 (if planned) or production deployment

---
*Phase: 04-open311-georeport-v2-api*
*Completed: 2026-07-08*
