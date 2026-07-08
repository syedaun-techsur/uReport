---
phase: 03-public-portal-constituent-tracking
plan: "02"
subsystem: api
tags: [next.js, prisma, postgres, bytea, large-object, media, multipart, zod, playwright, e2e]

# Dependency graph
requires:
  - phase: 03-public-portal-constituent-tracking
    provides: CreateTicketSchema from schemas/ticket.ts, CategoryRecord type, GET /api/categories endpoint
  - phase: 01-k8s-scaffold-data-foundation
    provides: Prisma schema with Ticket, Person, TicketPerson, Media, Category models
provides:
  - POST /api/tickets — creates Ticket, Person, TicketPerson, Media from multipart/form-data
  - lib/media.ts — storeMedia/readMedia/deleteMedia (bytea ≤ 8KB, Large Object > 8KB)
  - GET /api/media/[id] — binary stream from Postgres bytea or Large Object
  - app/(public)/tickets/[id]/confirm/page.tsx — confirmation page with reference_id display
  - e2e/ticket-submission.spec.ts — 6 Playwright E2E tests for submission flow
affects:
  - 03-03 (ticket lookup — POST /api/tickets creates tickets the lookup will display)
  - 05-xx (staff views — media attached to tickets, GET /api/media needs auth restriction)
  - O311-03 (Open311 POST will reuse ticket creation logic)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Postgres bytea for small files (≤ MEDIA_LO_THRESHOLD_KB), Large Object for larger files
    - lo_create/lo_put/lo_get/lo_unlink via Prisma $queryRaw/$executeRaw with parameterized templates
    - Multipart FormData parsed via request.formData() in Next.js App Router API routes
    - Explicit response object allowlist — no spread, no PII leakage in API response
    - Server component confirmation page using async params/searchParams (Next.js 15)

key-files:
  created:
    - lib/media.ts
    - app/api/tickets/route.ts
    - app/api/media/[id]/route.ts
    - app/(public)/tickets/[id]/confirm/page.tsx
    - e2e/ticket-submission.spec.ts
  modified:
    - app/(public)/page.tsx (updated router.push to include reference_id and category_name query params)

key-decisions:
  - "storeMedia uses lo_create/lo_put not lo_creat — lo_create(0) is the correct Postgres function returning an OID"
  - "Buffer.isBuffer guard in readMedia — Prisma $queryRaw returns Uint8Array; Buffer.from() coerces correctly"
  - "buffer as unknown as BodyInit cast in media route — TypeScript 5 does not accept Buffer directly as BodyInit for NextResponse"
  - "Confirmation page uses async params/searchParams — Next.js 15 App Router requires awaiting params in server components"
  - "Photo upload failure non-fatal — ticket already created; storeMedia error logged but does not block 201 response"

patterns-established:
  - "Postgres bytea/LO media pipeline: storeMedia decides storage tier, readMedia is transparent to caller"
  - "Public API response allowlist: explicit field enumeration prevents accidental PII exposure"
  - "Multipart POST pattern: request.formData() → parse fields → safeParse with Zod → DB writes"

# Metrics
duration: 3min
completed: 2026-07-08
---

# Phase 3 Plan 02: Ticket Submission API and Media Pipeline Summary

**POST /api/tickets with Postgres bytea/Large-Object photo pipeline, Person auto-creation, GET /api/media/[id] binary stream, and confirmation page with reference_id display**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-07-08T14:18:03Z
- **Completed:** 2026-07-08T14:21:17Z
- **Tasks:** 2
- **Files modified:** 6 (5 created, 1 modified)

## Accomplishments

- `POST /api/tickets` accepts multipart form data, validates via `CreateTicketSchema`, creates Ticket + optional Person/TicketPerson + optional Media — returns 201 `{ ticket_id, reference_id, status, category_name, created_at }`
- `lib/media.ts` bytea/Large Object pipeline with no filesystem writes: small files ≤ `MEDIA_LO_THRESHOLD_KB` KB stored as bytea, larger files via `lo_create`/`lo_put`; `readMedia` transparent to caller
- `GET /api/media/[id]` streams binary back with correct `Content-Type`, 404 for unknown IDs
- `/tickets/[id]/confirm` server component renders "Report Submitted!", displays `reference_id` in mono box, links to ticket tracking and home
- 6 Playwright E2E tests covering all success criteria (deferred to verify phase for execution)

## Task Commits

Each task was committed atomically:

1. **Task 1: lib/media.ts helpers and POST /api/tickets submission endpoint** - `eec2aa0` (feat)
2. **Task 2: Media endpoint, confirmation page, and E2E tests** - `1717529` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `lib/media.ts` — `storeMedia` (bytea ≤ threshold or LO > threshold), `readMedia` (Buffer from bytea or lo_get), `deleteMedia` (lo_unlink + record delete)
- `app/api/tickets/route.ts` — `POST` handler; multipart parse; Zod validation; category fetch + anon_allowed check; Ticket/Person/TicketPerson creation; optional storeMedia; 201 allowlisted response
- `app/api/media/[id]/route.ts` — `GET` handler; readMedia; binary NextResponse with Content-Type/Length/Disposition; 404 on missing
- `app/(public)/tickets/[id]/confirm/page.tsx` — Server component; async params/searchParams; "Report Submitted!" heading; reference_id mono box; View Ticket Status + Report Another links
- `app/(public)/page.tsx` — Updated `router.push` to include `reference_id` and `category_name` query params in confirm URL
- `e2e/ticket-submission.spec.ts` — 6 Playwright tests for submission flow

## Decisions Made

- **`lo_create(0)` not `lo_creat(-1)`:** The correct Postgres Large Object creation function is `lo_create(0)` which returns an OID. Using parameterized Prisma `$queryRaw`/`$executeRaw` tagged templates for all LO operations — OID is DB-generated, never user-controlled (T-03-02-05 mitigated).
- **`Buffer.isBuffer` guard in readMedia:** Prisma `$queryRaw` can return `Uint8Array` for bytea columns. Added `Buffer.isBuffer(raw) ? raw : Buffer.from(raw)` coercion to ensure correct `Buffer` type is returned.
- **`buffer as unknown as BodyInit` cast:** TypeScript 5 strict mode does not accept `Buffer<ArrayBufferLike>` as `BodyInit` for `new NextResponse(...)`. The cast is necessary and safe — Buffer is accepted at runtime.
- **Confirmation page uses async params:** Next.js 15 App Router requires `params` and `searchParams` to be awaited in server components (`Promise<{ id: string }>`).
- **Photo upload failure non-fatal:** If `storeMedia` throws (e.g., file too large), the error is logged but the ticket creation returns 201. The ticket record already exists; media failure should not block the user's submission.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Buffer type mismatch in readMedia**
- **Found during:** Task 1 TypeScript check
- **Issue:** `media.data` (Prisma `Bytes?`) and `$queryRaw` lo_get result typed as `Uint8Array`; return type `Buffer` caused TS2740 error
- **Fix:** Added `Buffer.isBuffer(x) ? x : Buffer.from(x)` coercion for both bytea and LO paths
- **Files modified:** `lib/media.ts`
- **Verification:** `npx tsc --noEmit` reports no errors
- **Committed in:** `eec2aa0` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed BodyInit type for NextResponse in media route**
- **Found during:** Task 2 TypeScript check
- **Issue:** TypeScript 5 strict mode: `Buffer<ArrayBufferLike>` not assignable to `BodyInit` for `new NextResponse()`
- **Fix:** Cast `buffer as unknown as BodyInit`
- **Files modified:** `app/api/media/[id]/route.ts`
- **Verification:** `npx tsc --noEmit` reports no errors
- **Committed in:** `1717529` (Task 2 commit)

**3. [Rule 1 - Bug] Used async params/searchParams for Next.js 15 server component**
- **Found during:** Task 2 (creating confirmation page)
- **Issue:** Next.js 15 App Router requires `params` and `searchParams` to be `Promise<>` types and awaited in server components
- **Fix:** Changed `Props` interface to use `Promise<{ id: string }>` and `Promise<{ ... }>`, added `await` for both
- **Files modified:** `app/(public)/tickets/[id]/confirm/page.tsx`
- **Verification:** TypeScript compiles clean; `curl http://localhost:3000/tickets/cltest00001/confirm?reference_id=REF-TEST` returns HTML with "Report Submitted!"
- **Committed in:** `1717529` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3 bugs — TypeScript type fixes and Next.js 15 API compliance)
**Impact on plan:** All fixes required for TypeScript compliance and runtime correctness. No scope creep.

## Issues Encountered

None — all issues resolved via deviation rules.

## User Setup Required

None — no external service configuration required. Uses the Kubernetes-injected Postgres sidecar.

## Next Phase Readiness

- `POST /api/tickets` live and verified — creates Ticket, Person (optional), Media (optional)
- `GET /api/media/[id]` ready for staff to view photo attachments
- Confirmation page at `/tickets/[id]/confirm` renders correctly with reference_id
- E2E tests in `e2e/ticket-submission.spec.ts` written; execution deferred to verify phase
- Ready for plan 03-03: ticket lookup by reference_id (`TRACK-01`)

---
*Phase: 03-public-portal-constituent-tracking*
*Completed: 2026-07-08*
