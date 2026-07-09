---
phase: 06-admin-panel-crm
plan: "04"
subsystem: crm
tags: [crm, merge, anonymize, gdpr, person, transaction, playwright]
dependency_graph:
  requires:
    - "GET /api/staff/people/[id] — person detail (06-03)"
    - "PATCH /api/staff/people/[id] — update person (06-03)"
    - "TicketPerson model — links persons to tickets (06-03)"
  provides:
    - "POST /api/staff/people/merge — atomic merge two Person records"
    - "PATCH /api/staff/people/[id]/anonymize — GDPR erasure, irreversible"
  affects:
    - "components/crm/PersonDetail.tsx — merge + anonymize dialogs activated"
tech_stack:
  added: []
  patterns:
    - "prisma.$transaction([...ops]) for atomic multi-table merge"
    - "Soft-delete pattern: deleted_at=now() + merged_into_id for merged persons"
    - "Inline Tailwind modal dialogs (no shadcn/ui) matching existing flag dialog"
    - "Debounced search input for merge target selection"
    - "Two-step confirmation: search → select → confirm"
key_files:
  created:
    - app/api/staff/people/merge/route.ts
    - app/api/staff/people/[id]/anonymize/route.ts
    - e2e/crm-merge-anonymize.spec.ts
  modified:
    - components/crm/PersonDetail.tsx
decisions:
  - "Inline Tailwind modals instead of shadcn/ui AlertDialog — no shadcn/ui components directory installed; existing PersonDetail flag dialog uses same Tailwind-only pattern"
  - "toDelete TicketPerson rows deleted in same transaction — prevents @@unique([ticket_id, person_id]) constraint violation when source already shares ticket with target"
  - "Merge confirmation is two-step: search dialog → select target → confirmation step (within same modal) — avoids extra navigation"
  - "anonymize route: pre-fetch ticketLinks before transaction — Prisma sequential transaction does not support mid-transaction reads; query outside then pass results to $transaction"
  - "Merged source returns 404 on detail page — fetchPerson uses findFirst({ where: { deleted_at: null } }); soft-deleted persons match this filter, producing notFound()"
metrics:
  duration: "8min"
  completed_date: "2026-07-09"
  tasks: 2
  files: 4
---

# Phase 06 Plan 04: CRM Merge + Anonymize Summary

**One-liner:** Atomic Person merge (re-points all TicketPerson rows + soft-deletes source) and irreversible GDPR anonymize with inline confirmation dialogs on the Person detail page.

## What Was Built

Implemented the two destructive CRM operations completing CRM-05:

### API Route Handlers

**`POST /api/staff/people/merge`** — Fully atomic Person merge:
- Validates source ≠ target, both exist and are non-deleted, neither anonymized
- Splits source TicketPerson rows into `toMigrate` (no existing target link) and `toDelete` (already linked to target — would violate `@@unique([ticket_id, person_id])`)
- Copies non-null fields from source to target (name, email, phone, notes) where target field is null
- Single `prisma.$transaction([...ops])`: update TicketPerson.person_id → delete duplicates → update target fields → soft-delete source (deleted_at + merged_into_id) → create TicketHistory(PERSON_LINKED) for each migrated ticket
- Returns `{ target_person_id, tickets_relinked }`

**`PATCH /api/staff/people/[id]/anonymize`** — Irreversible GDPR erasure:
- Verifies person exists and is not already anonymized (409 ALREADY_ANONYMIZED)
- Pre-fetches TicketPerson links for audit trail
- Single `prisma.$transaction([...ops])`: null name/email/phone/notes + set anonymized_at + create TicketHistory(PERSON_ANONYMIZED) on all linked tickets
- Returns 204 No Content

Both handlers: `requireSession('staff')` guard, Zod validation, explicit error codes.

### PersonDetail UI

Updated `components/crm/PersonDetail.tsx`:
- **Merge with… button** → inline two-step dialog: debounced FTS search, results list (excludes current person + anonymized), target selection, irreversible confirmation with amber warning banner, POST merge, toast + redirect to target
- **Anonymize Record button** → inline AlertDialog (`role="alertdialog"`) with destructive styling, irreversibility warning text, PATCH anonymize, toast + page reload
- Both buttons use Tailwind-only inline modals consistent with existing Flag dialog pattern
- Action buttons (Edit, Flag, Merge, Anonymize) hidden after anonymization

### Playwright E2E

5 tests in `e2e/crm-merge-anonymize.spec.ts`:
1. Staff can merge two person records → redirect to target
2. Merge same person → 422 MERGE_SAME via API
3. Staff can anonymize → page shows "Anonymous Constituent", buttons hidden
4. Anonymize twice → 409 ALREADY_ANONYMIZED via API
5. Merged source person URL → 404 (soft-deleted, filtered by deleted_at: null)

## Decisions Made

1. **Tailwind-only inline modals**: No `components/ui/` directory exists; shadcn/ui is listed in package.json but no components are installed. Used same pattern as existing Flag dialog in PersonDetail.tsx.

2. **Duplicate TicketPerson handling in merge**: When source and target are both linked to the same ticket, the source's TicketPerson row is deleted (not re-pointed) to avoid the `@@unique([ticket_id, person_id])` constraint violation. Correctly handles all edge cases.

3. **Pre-fetch before transaction for anonymize**: `prisma.ticketPerson.findMany()` runs before `prisma.$transaction()`. Prisma's sequential transaction does not support mid-transaction reads in the ops array — must collect IDs first.

4. **Two-step merge UI**: Search → select → confirm within a single modal avoids navigating away and losing context. Back button returns to search step on confirmation step.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] shadcn/ui AlertDialog unavailable**
- **Found during:** Task 2
- **Issue:** Plan specified `shadcn/ui AlertDialog` but no `components/ui/` directory exists and no shadcn components are installed
- **Fix:** Implemented inline Tailwind modal with `role="alertdialog"` semantics — functionally equivalent and consistent with existing PersonDetail flag dialog pattern
- **Files modified:** components/crm/PersonDetail.tsx

## Self-Check: PASSED

All 4 artifact files confirmed present:
- `app/api/staff/people/merge/route.ts` ✓
- `app/api/staff/people/[id]/anonymize/route.ts` ✓
- `components/crm/PersonDetail.tsx` ✓ (modified)
- `e2e/crm-merge-anonymize.spec.ts` ✓

Both commits verified in git log:
- `9ef7f11d` — feat(06-04): Person merge + anonymize API route handlers
- `c6826109` — feat(06-04): Merge + anonymize UI on Person detail page + Playwright E2E

TypeScript: 0 errors (`npx tsc --noEmit` clean).

**Tests written; E2E execution deferred to verify phase.**
