---
phase: 06-admin-panel-crm
plan: "01"
subsystem: api+ui
tags: [admin, categories, departments, substatuses, response-templates, audit-log, prisma, react-hook-form, zod, playwright]

# Dependency graph
requires:
  - phase: 01-k8s-scaffold-data-foundation
    provides: Category/Department/Substatus/ResponseTemplate/AdminAuditLog/CategoryGroup Prisma models
  - phase: 02-authentication-sessions
    provides: requireSession() auth guard + Auth.js session management
  - phase: 03-public-portal-constituent-tracking
    provides: api-response.ts helpers (ok, apiError)
provides:
  - GET+POST /api/admin/categories — category CRUD with group/dept selectors
  - PATCH /api/admin/categories/[id] — update/deactivate with open_ticket_count warning
  - GET+POST /api/admin/departments — department CRUD with user count
  - PATCH /api/admin/departments/[id] — update/deactivate with active_category_count warning
  - GET+POST /api/admin/substatuses — substatus CRUD with status bucket filter
  - PATCH /api/admin/substatuses/[id] — update substatus
  - PATCH /api/admin/substatuses/reorder — batch sort_order update in transaction
  - GET+POST /api/admin/response-templates — template CRUD with category/dept filter
  - PATCH /api/admin/response-templates/[id] — update/deactivate template
  - schemas/admin.ts — 9 Zod schemas for all admin CRUD inputs
  - app/admin/layout.tsx — admin sidebar shell
  - app/admin/categories/page.tsx — categories management UI
  - app/admin/departments/page.tsx — departments management UI
  - app/admin/substatuses/page.tsx — substatuses grouped by bucket with drag-to-reorder
  - app/admin/response-templates/page.tsx — templates table with body preview
  - components/admin/CategoryForm.tsx — react-hook-form + Zod form
  - components/admin/DepartmentForm.tsx — react-hook-form + Zod form
  - components/admin/SubstatusForm.tsx — react-hook-form + Zod form
  - components/admin/TemplateForm.tsx — react-hook-form + Zod, unknown token warning
  - e2e/admin-reference-data.spec.ts — 6 Playwright E2E tests
affects: [ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-07, ADMIN-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireSession('admin') as first operation in every /api/admin/** handler (T-06-01)"
    - "prisma.$transaction(async (tx) => ...) interactive form for all mutations + AdminAuditLog in same transaction"
    - "sla_hours silently omitted from DB writes — Zod schema keeps it for API compat, destructured out before prisma call"
    - "GET /api/admin/categories includes groups+departments in response — avoids separate API calls from form"
    - "HTML5 drag API for substatus reorder — no external DnD library"
    - "Unknown {{token}} detection in TemplateForm with orange warning (client-side, non-blocking)"

key-files:
  created:
    - schemas/admin.ts
    - app/api/admin/categories/route.ts
    - app/api/admin/categories/[id]/route.ts
    - app/api/admin/departments/route.ts
    - app/api/admin/departments/[id]/route.ts
    - app/api/admin/substatuses/route.ts
    - app/api/admin/substatuses/[id]/route.ts
    - app/api/admin/substatuses/reorder/route.ts
    - app/api/admin/response-templates/route.ts
    - app/api/admin/response-templates/[id]/route.ts
    - app/admin/layout.tsx
    - app/admin/categories/page.tsx
    - app/admin/departments/page.tsx
    - app/admin/substatuses/page.tsx
    - app/admin/response-templates/page.tsx
    - components/admin/CategoryForm.tsx
    - components/admin/DepartmentForm.tsx
    - components/admin/SubstatusForm.tsx
    - components/admin/TemplateForm.tsx
    - e2e/admin-reference-data.spec.ts
  modified: []

key-decisions:
  - "sla_hours kept in CreateCategorySchema for API compat but destructured out before prisma.category.create — Category model has no sla_hours column"
  - "GET /api/admin/categories returns groups+departments in top-level response keys — form populates both selectors from single API call"
  - "Interactive prisma.$transaction pattern used for all mutations — required to capture created.id for AdminAuditLog.resource_id"
  - "Admin UI pages implemented as client components (use client) — no server-side data fetch needed, all data from /api/admin/* endpoints"
  - "Substatus reorder uses HTML5 drag API (onDragStart/onDragOver/onDrop) — plan constraint to avoid external DnD libraries"
  - "E2E tests use 'Admin1234!secure' (matches prisma/seed.ts adminPasswordHash)"

patterns-established:
  - "Admin mutation pattern: requireSession('admin') → validate → check constraints → prisma.$transaction(create + adminAuditLog)"
  - "Deactivation warning pattern: count open/active references → include count in response → UI shows warning banner"
  - "Admin form pattern: react-hook-form + zodResolver(schema), server error state, onSuccess/onCancel callbacks"

# Metrics
duration: 8min
completed: 2026-07-09
---

# Phase 6 Plan 1: Admin Reference Data Management Summary

**Admin CRUD layer for Categories, Departments, Substatuses, and ResponseTemplates — 10 API route handlers with AdminAuditLog in every transaction, 4 admin UI pages with react-hook-form + Zod forms, and 6 Playwright E2E tests**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-07-09T00:00:00Z
- **Completed:** 2026-07-09T03:43:45Z
- **Tasks:** 2
- **Files created:** 20

## Accomplishments

- `schemas/admin.ts`: 9 Zod schemas — `Create/Update` for Categories, Departments, Substatuses, ResponseTemplates + `ReorderSubstatus`
- 10 API route handlers: all enforce `requireSession('admin')` as first operation; every POST/PATCH creates `AdminAuditLog` in the same `prisma.$transaction`
- Category API: service_code uniqueness (all rows, not just active), group/dept FK validation, deactivation returns `open_ticket_count`
- Department API: name uniqueness (active only), assignee FK validation, deactivation returns `active_category_count`
- Substatus API: label+status uniqueness, reorder endpoint batch-updates sort_order in single transaction
- ResponseTemplate API: name uniqueness (active only), category/dept FK validation, TEMPLATE_DEACTIVATED vs TEMPLATE_UPDATED audit action
- GET `/api/admin/categories` includes `groups` and `departments` arrays in response for form selector population
- 4 admin pages with create/edit forms + deactivation buttons + warning banners
- Substatus page groups by status bucket with HTML5 drag-to-reorder
- TemplateForm warns (orange, non-blocking) on unknown `{{token}}` placeholders
- 6 Playwright E2E tests: create category, deactivate category, create department, create substatus, create template (with known token), staff access denied to /admin/**

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod schemas + all 10 admin API route handlers** — `e69b19b2` (feat)
2. **Task 2: Admin UI pages + form components + Playwright E2E** — `ffae8351` (feat)

_Note: E2E tests written; execution deferred to verify phase._

## Files Created/Modified

**Task 1 (API layer):**
- `schemas/admin.ts` — 9 Zod schemas with type exports
- `app/api/admin/categories/route.ts` — GET (with groups+depts) + POST (service_code uniqueness, FK checks)
- `app/api/admin/categories/[id]/route.ts` — PATCH with deactivation + open_ticket_count
- `app/api/admin/departments/route.ts` — GET (with user count via _count) + POST
- `app/api/admin/departments/[id]/route.ts` — PATCH with active_category_count on deactivation
- `app/api/admin/substatuses/route.ts` — GET (with status filter) + POST
- `app/api/admin/substatuses/[id]/route.ts` — PATCH with label+status uniqueness check
- `app/api/admin/substatuses/reorder/route.ts` — PATCH batch reorder in single transaction
- `app/api/admin/response-templates/route.ts` — GET (with category/dept filter) + POST
- `app/api/admin/response-templates/[id]/route.ts` — PATCH with TEMPLATE_DEACTIVATED action

**Task 2 (UI layer):**
- `app/admin/layout.tsx` — admin sidebar shell with 7 nav links
- `app/admin/categories/page.tsx` — categories manager with deactivation warning banner
- `app/admin/departments/page.tsx` — departments manager with active_category_count warning
- `app/admin/substatuses/page.tsx` — substatus manager grouped by bucket with drag-to-reorder
- `app/admin/response-templates/page.tsx` — templates table with body preview (100 chars)
- `components/admin/CategoryForm.tsx` — react-hook-form + Zod, group/dept select dropdowns
- `components/admin/DepartmentForm.tsx` — react-hook-form + Zod, staff user assignee dropdown
- `components/admin/SubstatusForm.tsx` — react-hook-form + Zod, status bucket selector
- `components/admin/TemplateForm.tsx` — react-hook-form + Zod, token hint list, unknown token orange warning
- `e2e/admin-reference-data.spec.ts` — 6 Playwright tests

## Decisions Made

- `sla_hours` kept in `CreateCategorySchema` for API compatibility but destructured out before `prisma.category.create` — the `Category` Prisma model has no `sla_hours` column (Phase 1 schema constraint)
- `GET /api/admin/categories` returns `groups` and `departments` top-level keys — single API call populates both form selectors, avoiding a new `/api/admin/category-groups` route
- Interactive `prisma.$transaction(async (tx) => ...)` pattern used throughout — only way to capture `created.id` for `AdminAuditLog.resource_id` in same transaction
- Admin pages implemented as client components (`'use client'`) — Next.js 15 server components would require a separate client component for interactivity; simpler to keep as fully client
- HTML5 native drag API for substatus reorder — plan explicitly avoided external DnD libraries
- E2E admin login password: `Admin1234!secure` (matches `prisma/seed.ts` `bcrypt.hash('Admin1234!secure', 12)`)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. All constraints honored:
- Named import `{ prisma }` from `@/lib/prisma` ✓
- `requireSession('admin')` first in every handler ✓
- Next.js 15 async params pattern ✓
- AdminAuditLog in same transaction ✓
- sla_hours omitted from DB writes ✓
- No X-Frame-Options headers ✓

## Issues Encountered

None — TypeScript compiled cleanly (0 errors) for all 20 new files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Admin reference data layer complete: Categories, Departments, Substatuses, ResponseTemplates all manageable via UI
- Enables ADMIN-05 (user management needs dept list — `/api/admin/departments` ready), ADMIN-06 (API key management)
- Enables CRM-01 through CRM-05 (CRM features need category/dept reference data)
- E2E tests written; execution deferred to verify phase

## Self-Check: PASSED

All 20 key files verified on disk. Both task commits (e69b19b2, ffae8351) confirmed in git log.

---
*Phase: 06-admin-panel-crm*
*Completed: 2026-07-09*
