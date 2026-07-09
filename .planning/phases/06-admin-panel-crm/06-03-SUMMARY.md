---
phase: 06-admin-panel-crm
plan: "03"
subsystem: crm
tags: [crm, people, fts, person-search, staff-pages, playwright]
dependency_graph:
  requires: []
  provides:
    - "GET /api/staff/people — Postgres FTS person search"
    - "POST /api/staff/people — create person"
    - "GET /api/staff/people/[id] — person detail with linked tickets"
    - "PATCH /api/staff/people/[id] — update contact details"
    - "POST /api/staff/tickets/[id]/persons — link person (TicketPerson + TicketHistory tx)"
    - "DELETE /api/staff/tickets/[id]/persons/[person_id] — unlink person"
    - "/staff/people — CRM people search page"
    - "/staff/people/[id] — person detail page"
    - "/staff/people/new — create person form"
    - "/staff/people/[id]/edit — edit contact details form"
  affects:
    - "app/api/staff/tickets/[id]/ — persons sub-routes added to existing ticket API"
tech_stack:
  added: []
  patterns:
    - "Postgres FTS via $queryRaw with person_search_vector @@ plainto_tsquery('simple', q)"
    - "Server component + client component split for pages with form interactions"
    - "react-hook-form + Zod resolver for PersonForm"
    - "PII field masking for anonymized persons in all API responses"
    - "TicketPerson + TicketHistory created atomically in $transaction"
key_files:
  created:
    - schemas/person.ts
    - app/api/staff/people/route.ts
    - app/api/staff/people/[id]/route.ts
    - app/api/staff/tickets/[id]/persons/route.ts
    - app/api/staff/tickets/[id]/persons/[person_id]/route.ts
    - app/staff/people/page.tsx
    - app/staff/people/[id]/page.tsx
    - app/staff/people/new/page.tsx
    - app/staff/people/[id]/edit/page.tsx
    - app/staff/people/[id]/edit/_EditPersonClient.tsx
    - components/crm/PersonSearchPanel.tsx
    - components/crm/PersonDetail.tsx
    - components/crm/PersonForm.tsx
    - e2e/crm-people.spec.ts
  modified: []
decisions:
  - "Server component + client component split for edit page: server fetches person, passes to _EditPersonClient; avoids useEffect self-fetch while keeping form interactivity"
  - "FTS uses 'simple' dictionary (same as Phase 1 decision) — preserves email/phone digits for person search"
  - "Anonymized persons masked at API layer not DB layer — name/email/phone/notes returned as null; display_name='Anonymous Constituent' added to response"
  - "Flag as Duplicate (CRM-05) implemented pragmatically: prepends 'DUPLICATE FLAG: {note}' to person.notes via PATCH — no separate DB field needed in v1"
  - "Edit page rendered in server component but form interactions in _EditPersonClient.tsx (co-located client component) — cleaner than full client page"
  - "Delete unlink route returns 204 No Content (no body) for successful unlink"
metrics:
  duration: "8min"
  completed_date: "2026-07-09"
  tasks: 2
  files: 14
---

# Phase 06 Plan 03: CRM People Management Summary

**One-liner:** Full CRM people module — Postgres FTS search, person CRUD, ticket linking/unlinking, anonymized PII masking, and staff pages with react-hook-form + Zod validation.

## What Was Built

Implemented the complete CRM people management module (CRM-01 through CRM-05) covering:

- **Person search** via Postgres FTS (`person_search_vector @@ plainto_tsquery('simple', q)`) with pagination and ts_rank ordering
- **Person CRUD** — create, read, update with explicit PII field allowlists
- **Ticket relationship management** — link/unlink persons with atomic TicketPerson + TicketHistory transactions
- **Anonymization support** — all API responses mask PII fields (null) for anonymized persons
- **Staff role enforcement** — submitter unlinking blocked at 403 for non-admin staff
- **4 CRM staff pages** with server component shells and client interactive components
- **3 CRM UI components**: PersonSearchPanel (debounced FTS), PersonDetail (contact card + linked tickets + flag dialog), PersonForm (validated form)
- **6 Playwright E2E tests** covering all CRM-01 through CRM-05 scenarios

## Decisions Made

1. **Server+client split for edit page**: `page.tsx` (server, fetches person) + `_EditPersonClient.tsx` (client, handles form/redirect). Avoids self-fetch cookie issues while keeping interactivity.

2. **'simple' FTS dictionary**: Matches Phase 1 decision — 'simple' preserves email addresses and phone digit sequences without stemming.

3. **PII masking at API layer**: `name/email/phone/notes` returned as `null` with `display_name: 'Anonymous Constituent'` appended for anonymized records. Consistent across all endpoints.

4. **CRM-05 duplicate flagging**: Pragmatic v1 — PATCH person.notes prepending `"DUPLICATE FLAG: {note}"`. No separate DB field. Plan 06-04 (merge/anonymize) builds dedicated workflow on top.

5. **204 No Content for unlink DELETE**: Standard REST semantics — no response body needed on successful delete.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 13 artifact files exist at expected paths. Both task commits verified in git log:
- `629b7a9d` — feat(06-03): CRM Person schemas + API route handlers
- `c88750c6` — feat(06-03): CRM staff pages + UI components + Playwright E2E

**Tests written; E2E execution deferred to verify phase.**
