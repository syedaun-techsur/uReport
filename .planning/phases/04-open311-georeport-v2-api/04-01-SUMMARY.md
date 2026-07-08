---
phase: 04-open311-georeport-v2-api
plan: "01"
subsystem: api
tags: [open311, georeport-v2, typescript, zod, vitest, rate-limiting, xml, api-key]

# Dependency graph
requires:
  - phase: 01-k8s-scaffold-data-foundation
    provides: Prisma schema with ApiKey model (key_hash, scope, revoked_at), Category, Ticket models
  - phase: 03-public-portal-constituent-tracking
    provides: Category schema with service_code field used by categoryToService

provides:
  - "lib/open311.ts: ticketToServiceRequest, categoryToService, toXml, parseApiKey, verifyApiKey, wantsXml"
  - "types/open311.ts: Open311Service, Open311ServiceRequest, Open311Error TypeScript interfaces"
  - "schemas/open311.ts: Open311PostRequestSchema, Open311GetRequestsQuerySchema Zod validators"
  - "lib/rate-limit.ts: checkRateLimit sliding window in-process rate limiter"
  - "lib/open311.test.ts: 28 Vitest unit tests (all passing)"

affects:
  - "04-02 (route handlers depend on all 5 helper functions)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GeoReport v2 field name discipline: 'long' (not 'lng') for longitude in wire format"
    - "Template-literal XML serialization without external library"
    - "SHA-256 API key hash comparison (crypto.createHash('sha256'))"
    - "Fire-and-forget last_used_at update on successful auth"
    - "In-process sliding window rate limiter (single-pod model, no Redis)"

key-files:
  created:
    - lib/open311.ts
    - types/open311.ts
    - schemas/open311.ts
    - lib/rate-limit.ts
    - lib/open311.test.ts
  modified: []

key-decisions:
  - "GeoReport v2 field 'long' not 'lng' — Open311 spec uses 'long'; internal Prisma model uses 'lng'; ticketToServiceRequest maps lng→long explicitly"
  - "Template-literal XML with escapeXml() — no external XML library needed for simple flat structure"
  - "SHA-256 key hash comparison — plaintext API key hashed, compared to key_hash column via findUnique"
  - "Both missing and revoked keys return 'key_not_found' error — prevents key existence enumeration (T-04-03)"
  - "In-process rate limiter Map without Redis — single-pod municipal app, window expiry mitigates unbounded growth"

patterns-established:
  - "Open311 status mapping: open/in_progress → 'open', closed/archived → 'closed'"
  - "parseApiKey: X-Api-Key header takes priority over api_key query param"
  - "Zod schemas export inferred TypeScript types alongside schema objects"

# Metrics
duration: 2min
completed: 2026-07-08
---

# Phase 4 Plan 1: Open311 Library Layer Summary

**Open311 GeoReport v2 library layer: TypeScript interfaces, Zod schemas, field mapper (Ticket→ServiceRequest with 'long' not 'lng'), template-literal XML serializer, SHA-256 API key verifier, and in-process rate limiter — all tested with 28 passing Vitest unit tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-08T17:17:50Z
- **Completed:** 2026-07-08T17:19:51Z
- **Tasks:** 2 completed
- **Files created:** 5

## Accomplishments

- TypeScript interfaces (Open311Service, Open311ServiceRequest with `long` not `lng`, Open311Error) matching exact GeoReport v2 wire format
- Zod validation schemas for POST /api/open311/requests body and GET /api/open311/requests query params
- Field mapper `ticketToServiceRequest()` mapping all 18 GeoReport v2 fields with correct status (open/in_progress→open, closed/archived→closed)
- Lightweight `toXml()` using template literals with XML escaping — no external library
- `verifyApiKey()` using SHA-256 hash lookup against ApiKey.key_hash, returning `key_not_found` for both missing and revoked keys (enumeration prevention)
- In-process sliding window rate limiter in `lib/rate-limit.ts` for Open311 GET endpoints
- 28 Vitest unit tests covering all functions — 0 failures, 0 skipped

## Task Commits

Each task was committed atomically:

1. **Task 1: Open311 types, Zod schemas, and in-process rate limiter** - `e40f1cb` (feat)
2. **Task 2: lib/open311.ts field mapper, XML serializer, API key verifier + Vitest tests** - `594fd64` (feat)

## Files Created/Modified

- `types/open311.ts` — Open311Service, Open311ServiceRequest (with `long` field), Open311Error, Open311Status interfaces
- `schemas/open311.ts` — Open311PostRequestSchema (service_code, lat, long, address_string, description, api_key, etc.), Open311GetRequestsQuerySchema (status, dates, pagination, format)
- `lib/rate-limit.ts` — checkRateLimit() sliding window in-process rate limiter (60 req/min default)
- `lib/open311.ts` — ticketToServiceRequest, categoryToService, toXml, parseApiKey, verifyApiKey, wantsXml
- `lib/open311.test.ts` — 28 Vitest unit tests (ticketToServiceRequest×11, categoryToService×3, toXml×6, parseApiKey×4, wantsXml×3)

## Decisions Made

- **`long` not `lng`**: GeoReport v2 spec uses `long` for longitude; internal Prisma `Ticket.lng` is mapped explicitly in `ticketToServiceRequest()` — named field prevents silent mismatch
- **Template-literal XML**: No external XML library needed for flat GeoReport v2 structure; `escapeXml()` handles `&`, `<`, `>`, `"`, `'`
- **`key_not_found` for revoked keys**: Both missing and revoked keys return identical error code — prevents enumeration of whether a key exists (T-04-03 threat mitigation)
- **In-process rate limiter**: Single-pod model; Redis would be over-engineering for a municipal app; 1-minute window entries expire naturally

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 Open311 helper functions exported from `lib/open311.ts`: `ticketToServiceRequest`, `categoryToService`, `toXml`, `parseApiKey`, `verifyApiKey`
- Integration contracts verified (all grep checks passed: CONTRACT_OK, SCHEMA_CONTRACT_OK, TYPES_CONTRACT_OK, RATELIMIT_CONTRACT_OK)
- Ready for Plan 04-02: GeoReport v2 route handlers (GET /api/open311/services, GET /api/open311/requests, POST /api/open311/requests, etc.)

---
*Phase: 04-open311-georeport-v2-api*
*Completed: 2026-07-08*

## Self-Check: PASSED

- FOUND: lib/open311.ts
- FOUND: types/open311.ts
- FOUND: schemas/open311.ts
- FOUND: lib/rate-limit.ts
- FOUND: lib/open311.test.ts
- FOUND: commit e40f1cb (Task 1)
- FOUND: commit 594fd64 (Task 2)
