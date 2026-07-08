---
phase: 05-staff-ticket-console
plan: "04"
subsystem: api
tags: [staff, tickets, mutations, responses, media-upload, response-templates, playwright]

# Dependency graph
requires:
  - phase: 05-staff-ticket-console
    plan: "03"
    provides: GET /api/staff/tickets/[id], MediaGallery read-only, detail page with action-panel placeholder
provides:
  - PATCH /api/staff/tickets/[id] — status+substatus+assignee+department change with TicketHistory
  - POST /api/staff/tickets/[id]/responses — add internal note or public response with TicketHistory
  - POST /api/staff/tickets/[id]/media — multipart file upload (image/PDF) with TicketHistory
  - GET /api/staff/users?q= — active staff typeahead for assignee picker
  - GET /api/staff/response-templates — active templates with category/department filter
  - components/tickets/ResponseComposer — internal/public toggle, template picker, textarea, submit
  - components/tickets/MediaGallery — updated with file upload capability
  - app/staff/tickets/[id]/page.tsx — updated with StatusControl, AssigneeControl, ResponseComposer, MediaGallery upload
  - e2e/staff-ticket-mutations.spec.ts — 4 Playwright E2E mutation tests
affects: [verify-phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "prisma.$transaction([...]) array form for same-type ops (PATCH route)"
    - "prisma.$transaction(async (tx) => {...}) interactive form for storeMedia calls (media route)"
    - "Client-side {{placeholder}} substitution in template body before textarea insert"
    - "StatusControl inline confirmation dialog (no shadcn AlertDialog) — Tailwind-only pattern"
    - "AssigneeControl debounced typeahead with 300ms debounce, onBlur dismiss"

key-files:
  created:
    - app/api/staff/tickets/[id]/responses/route.ts
    - app/api/staff/tickets/[id]/media/route.ts
    - app/api/staff/users/route.ts
    - app/api/staff/response-templates/route.ts
    - components/tickets/ResponseComposer.tsx
    - e2e/staff-ticket-mutations.spec.ts
  modified:
    - app/api/staff/tickets/[id]/route.ts
    - components/tickets/MediaGallery.tsx
    - app/staff/tickets/[id]/page.tsx

key-decisions:
  - "prisma.$transaction interactive form (async tx callback) used for media route — storeMedia needs transaction client, not PrismaClient; cast tx as Parameters<typeof storeMedia>[0]"
  - "StatusControl uses inline confirmation UI (Tailwind-only) — no shadcn AlertDialog to keep scope consistent with existing FilterPanel/BookmarkBar patterns"
  - "AssigneeControl inline in page.tsx — plan specified 'inline in page.tsx' to keep scope bounded; no separate file"
  - "Empty body validation: CreateResponseSchema refine() catches whitespace-only; EMPTY_RESPONSE error code returned for both Zod refine failure and client-side pre-check"

patterns-established:
  - "Mutation route pattern: requireSession → validate body → fetch current state → guard → $transaction([update, ...historyCreates]) → re-fetch full shape"
  - "Media route pattern: requireSession → validate ticket → validate files → $transaction(async tx => { storeMedia loop + ticketHistory + ticket update })"

# Metrics
duration: 5min
completed: 2026-07-08
---

# Phase 5 Plan 4: Staff Ticket Mutations Summary

**All ticket mutation endpoints (PATCH status/assignee, POST responses, POST media), ResponseComposer with template picker and client-side placeholder substitution, MediaGallery upload, StatusControl, and AssigneeControl — every mutation uses `prisma.$transaction` for atomicity with TicketHistory**

## Performance

- **Duration:** 5 min
- **Started:** 2026-07-08T20:10:58Z
- **Completed:** 2026-07-08T20:16:05Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- `PATCH /api/staff/tickets/[id]` with status transition guard (staff cannot reopen closed tickets → 403 TRANSITION_FORBIDDEN), substatus validation, and all changes wrapped in `prisma.$transaction`
- `POST /api/staff/tickets/[id]/responses` creates Response + TicketHistory in a transaction; EMPTY_RESPONSE 422 for whitespace-only body
- `POST /api/staff/tickets/[id]/media` validates MIME (image/* + application/pdf) and size (10MB), calls `storeMedia` in interactive `$transaction` callback
- `GET /api/staff/users?q=` and `GET /api/staff/response-templates` with optional filtering
- `ResponseComposer` with internal/public toggle, template picker, client-side `{{ticket_id}}/{{address}}/{{category_name}}` substitution, and `data-testid="response-body"/"response-submit"/"response-error"` attributes
- `MediaGallery` updated from read-only to include file upload with inline error display
- `StaffTicketDetailPage` updated with `StatusControl` (select + inline confirm dialog), `AssigneeControl` (debounced typeahead), `ResponseComposer`, and `MediaGallery.onUploadSuccess` — all callbacks trigger `fetchTicket` refetch

## Task Commits

Each task was committed atomically:

1. **Task 1: Mutation API routes — PATCH ticket, POST responses, POST media, GET users, GET templates** - `fa5b21a` (feat)
2. **Task 2: ResponseComposer + MediaGallery upload + detail page action panel + Playwright E2E** - `d92e76e` (feat)

**Plan metadata:** TBD (docs commit)

_Note: E2E tests written; execution deferred to verify phase._

## Files Created/Modified

- `app/api/staff/tickets/[id]/route.ts` — Added PATCH handler with transition guard, substatus validation, $transaction mutations
- `app/api/staff/tickets/[id]/responses/route.ts` — POST response + TicketHistory + ticket.updated_at in $transaction; EMPTY_RESPONSE 422
- `app/api/staff/tickets/[id]/media/route.ts` — POST multipart upload; MIME/size validation; storeMedia + TicketHistory in interactive $transaction
- `app/api/staff/users/route.ts` — GET active staff typeahead (insensitive search, take 20)
- `app/api/staff/response-templates/route.ts` — GET active templates with category_id/department_id filter
- `components/tickets/ResponseComposer.tsx` — Internal/public toggle, template picker, client-side placeholder substitution, textarea, submit
- `components/tickets/MediaGallery.tsx` — Added file input, upload to POST /media, inline MEDIA_TOO_LARGE/MEDIA_TYPE_INVALID/MEDIA_TOO_MANY errors, onUploadSuccess callback
- `app/staff/tickets/[id]/page.tsx` — Added StatusControl, AssigneeControl, ResponseComposer, updated MediaGallery with onUploadSuccess — all with fetchTicket refetch
- `e2e/staff-ticket-mutations.spec.ts` — 4 Playwright tests: PATCH status+history entry, POST response 201, empty body 422 EMPTY_RESPONSE, ResponseComposer UI render+submit

## Decisions Made

- Used `prisma.$transaction` interactive form (async tx callback) for media route — `storeMedia(prisma, ...)` needs the PrismaClient interface; casting `tx` as `Parameters<typeof storeMedia>[0]` satisfies TypeScript without changing `storeMedia` signature
- StatusControl uses inline Tailwind confirmation UI — keeping consistent with existing FilterPanel/BookmarkBar Tailwind-only patterns (no shadcn/UI per 05-01 decision)
- StatusControl and AssigneeControl implemented inline in `page.tsx` — plan explicitly stated "inline in page.tsx or tiny sub-component to keep plan scope bounded"
- EMPTY_RESPONSE error code surfaced from both Zod `refine()` check (server) and API response `code` field (client) — consistent handling prevents duplicate validation code

## Deviations from Plan

None - plan executed exactly as written.

The plan specified the exact transaction patterns, validation rules, component props, and E2E test structure. All tasks followed the plan specification. TypeScript compiled with 0 errors for all new and modified files.

## Issues Encountered

None — TypeScript compiled cleanly (0 errors). All integration contracts verified.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 complete: all staff ticket console features implemented (queue, bookmarks, detail read, mutations)
- All 5 mutation routes auth-gated with `requireSession('staff')`
- T-05-14/T-05-15/T-05-17/T-05-18/T-05-19 threat mitigations implemented
- E2E tests written in `e2e/staff-ticket-mutations.spec.ts`; execution deferred to verify phase
- Ready for Phase 5 verification (`/pivota_spec-verify-work`)

## Self-Check: PASSED

All key files verified on disk:
- `app/api/staff/tickets/[id]/responses/route.ts` ✓
- `app/api/staff/tickets/[id]/media/route.ts` ✓
- `app/api/staff/users/route.ts` ✓
- `app/api/staff/response-templates/route.ts` ✓
- `components/tickets/ResponseComposer.tsx` ✓
- `components/tickets/MediaGallery.tsx` ✓ (modified)
- `app/staff/tickets/[id]/page.tsx` ✓ (modified)
- `e2e/staff-ticket-mutations.spec.ts` ✓

Both task commits (fa5b21a, d92e76e) confirmed in git log.

---
*Phase: 05-staff-ticket-console*
*Completed: 2026-07-08*
