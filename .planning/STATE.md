---
pivota_spec_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 06-04-PLAN.md
last_updated: "2026-07-09T05:00:00.000Z"
last_activity: "2026-07-09 — Phase 6 complete: Admin Panel & CRM (4/4 plans done)"
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 26
  completed_plans: 26
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-06)

**Core value:** City constituents can report municipal issues and staff can manage the full ticket lifecycle — all from one responsive, accessible web app running as a single Kubernetes pod with a Postgres sidecar.
**Current focus:** Phase 7 — Reports + Metrics Dashboard

## Current Position

Phase: 6 of 7 (Admin Panel & CRM) — COMPLETE
Plan: 4 of 4 completed (06-04 done — CRM merge + anonymize)
Status: Phase 6 complete — Admin Panel & CRM fully implemented
Last activity: 2026-07-09 — Phase 6 complete: 4 plans, Admin Panel & CRM

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 2
- Average duration: 3.5 min
- Total execution time: 7 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-k8s-scaffold-data-foundation | P01 | 3min | 3min |
| 01-k8s-scaffold-data-foundation | P02 | 4min | 4min |

**Recent Trend:**

- Last 5 plans: 3min, 4min
- Trend: steady

*Updated after each plan completion*
| Phase 01-k8s-scaffold-data-foundation P03 | 2min | 2 tasks | 8 files |
| Phase 02-authentication-sessions P01 | 3min | 2 tasks | 6 files |
| Phase 02-authentication-sessions P03 | 1min | 1 tasks | 1 files |
| Phase 02-authentication-sessions P04 | 1min | 2 tasks | 2 files |
| Phase 02-authentication-sessions P05 | 1min | 2 tasks | 2 files |
| Phase 02-authentication-sessions P06 | 1min | 2 tasks | 3 files |
| Phase 02-authentication-sessions P08 | 1min | 1 tasks | 1 files |
| Phase 02-authentication-sessions P07 | 2min | 2 tasks | 4 files |
| Phase 03-public-portal-constituent-tracking P03 | 3min | 2 tasks | 6 files |
| Phase 03-public-portal-constituent-tracking P01 | 5min | 2 tasks | 7 files |
| Phase 03-public-portal-constituent-tracking P04 | 1min | 1 tasks | 1 files |
| Phase 03-public-portal-constituent-tracking P05 | 1min | 2 tasks | 2 files |
| Phase 04-open311-georeport-v2-api P01 | 2min | 2 tasks | 5 files |
| Phase 05-staff-ticket-console P01 | 5min | 2 tasks | 9 files |
| Phase 05-staff-ticket-console P02 | 3min | 2 tasks | 5 files |
| Phase 05-staff-ticket-console P03 | 2min | 2 tasks | 7 files |
| Phase 05-staff-ticket-console P04 | 5min | 2 tasks | 9 files |
| Phase 06-admin-panel-crm P01 | 8min | 2 tasks | 20 files |
| Phase 06-admin-panel-crm P03 | 8min | 2 tasks | 14 files |
| Phase 06-admin-panel-crm P02 | 15min | 2 tasks | 15 files |
| Phase 06-admin-panel-crm P04 | 8min | 2 tasks | 4 files |
| Phase 07-reports-metrics-dashboard P01 | 6min | 2 tasks | 9 files |
| Phase 07-reports-metrics-dashboard P02 | 8min | 2 tasks | 11 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Full-stack Next.js 15 single process — one port maps cleanly to K8s single-pod; avoids dual-process complexity
- [Init]: Prisma ORM + PostgreSQL 16 sidecar — `prisma migrate deploy` at boot, idempotent
- [Init]: Postgres FTS (tsvector+GIN) replaces Solr — eliminates second stateful service
- [Init]: PostGIS as enhancement, not hard dep — graceful Haversine fallback
- [Init]: Auth.js credentials provider (no OAuth) — three roles: public/staff/admin
- [Phase 01-k8s-scaffold-data-foundation]: No X-Frame-Options in next.config.ts — Pivota Preview iframe constraint (INFRA-07)
- [Phase 01-k8s-scaffold-data-foundation]: next-auth@5.0.0-beta.31 — v5 not published as stable; beta tag required
- [Phase 01-k8s-scaffold-data-foundation]: docker-compose.legacy.yml — neutralized legacy MySQL compose to allow Postgres sidecar provisioning
- [Phase 01-k8s-scaffold-data-foundation]: search_vector tsvector NOT in Prisma schema — added via ALTER TABLE in migration SQL (Prisma cannot represent tsvector natively)
- [Phase 01-k8s-scaffold-data-foundation]: FTS: 'english' dictionary for Ticket (stemming), 'simple' for Person (email/phone digits must not be stripped)
- [Phase 01-k8s-scaffold-data-foundation]: PostGIS migration uses DO $$ conditional block — silently skips geog column when PostGIS extension absent
- [Phase 02-authentication-sessions]: Credentials-only auth (no OAuth) — staff/admin are internal city employees
- [Phase 02-authentication-sessions]: token_version invalidation on every JWT decode — accepted for v1 (T-02-06)
- [Phase 02-authentication-sessions]: Generic 'Invalid username or password' error — prevents credential enumeration (T-02-02)
- [Phase 02-authentication-sessions]: Auto-seed on empty DB (user count = 0) rather than requiring SEED_ON_BOOT=true — eliminates UAT gap where all 8 auth tests failed on fresh DB
- [Phase 02-authentication-sessions]: Placeholder page required for middleware interception — Next.js returns 404 before middleware fires when page file is missing — Creating app/staff/tickets/page.tsx is the minimal fix for both Gap 2 and Gap 3
- [Phase 02-authentication-sessions]: AUTH_SECRET generated via openssl rand -hex 32 and placed in gitignored .env.local; .env.example committed as discoverable documentation
- [Phase 02-authentication-sessions]: signOut imported from next-auth/react (client) not @/lib/auth (server-only) — correct client-side path for next-auth v5 beta
- [Phase 02-authentication-sessions]: Migrate+seed block placed below END PIVOTA PREAMBLE marker in start-dev.sh preserved region — survives start-dev.sh regeneration by START-DEV workflow
- [Phase 02-authentication-sessions]: SameSite=None; Secure applied unconditionally (not gated on NODE_ENV=production) — required for preview iframe; Pivota preview always runs over HTTPS
- [Phase 02-authentication-sessions]: csrfToken and callbackUrl cookies NOT httpOnly — Auth.js client-side signIn() must JS-read the CSRF token; httpOnly breaks every sign-in with CSRF mismatch
- [Phase 03-public-portal-constituent-tracking]: Named prisma import { prisma } not default — matches lib/prisma.ts export style used across project
- [Phase 03-public-portal-constituent-tracking]: Explicit response object allowlist in public API — no spread operator prevents accidental PII field leakage
- [Phase 03-public-portal-constituent-tracking]: CDN URLs for Leaflet marker icons — avoids Next.js static image import issues, consistent with ReportingMap.tsx
- [Phase 03-public-portal-constituent-tracking]: Remove app/page.tsx placeholder — (public)/page.tsx serves same / route; both cannot coexist in Next.js route groups
- [Phase 03-public-portal-constituent-tracking]: GET /api/categories includes group_name via CategoryGroup join — avoids separate API call from frontend category picker
- [Phase 03-public-portal-constituent-tracking]: Bracket notation scripts?.['db:migrate'] required for colon-containing npm script keys in Node.js inline -e expressions
- [Phase 03-public-portal-constituent-tracking]: findFirst with OR: [{ id }, { reference_id: id }] replaces findUnique for dual-key public ticket lookup
- [Phase 04-open311-georeport-v2-api]: GeoReport v2 field 'long' not 'lng' — Open311 spec uses 'long'; internal Prisma model uses 'lng'; ticketToServiceRequest maps lng→long explicitly
- [Phase 04-open311-georeport-v2-api]: Both missing and revoked API keys return 'key_not_found' — prevents enumeration of key existence (T-04-03 threat mitigation)
- [Phase 05-staff-ticket-console]: FTS uses Prisma.sql template literals throughout — $queryRawUnsafe explicitly forbidden (T-05-02)
- [Phase 05-staff-ticket-console]: Departments endpoint at /api/staff/departments (staff-auth) for FilterPanel dropdown — not public
- [Phase 05-staff-ticket-console]: E2E staff login uses 'identifier' field (not username) and password Staff1234!secure from prisma/seed.ts
- [Phase 05-staff-ticket-console]: No shadcn/UI — BookmarkBar uses Tailwind-only patterns matching existing FilterPanel/TicketTable
- [Phase 05-staff-ticket-console]: IDOR guard pattern: findFirst({ where: { id, user_id } }) before every bookmark mutation (T-05-06)
- [Phase 05-staff-ticket-console]: filter_json cast as Prisma.InputJsonValue — required for TypeScript strict Json field typing
- [Phase 05-staff-ticket-console]: MiniMap split into MiniMap.tsx wrapper + _MiniMapInner.tsx — dynamic(ssr:false) must wrap the file importing Leaflet
- [Phase 05-staff-ticket-console]: Staff detail page as client component using useEffect fetch — MiniMap requires use client context
- [Phase 05-staff-ticket-console]: prisma.$transaction interactive form for media route — storeMedia needs tx client; cast as Parameters<typeof storeMedia>[0]
- [Phase 06-admin-panel-crm P01]: sla_hours kept in CreateCategorySchema for API compat but omitted from DB writes — Category model has no sla_hours column
- [Phase 06-admin-panel-crm P01]: GET /api/admin/categories returns groups+departments in response — single call populates both selectors in CategoryForm
- [Phase 06-admin-panel-crm P01]: Interactive prisma.$transaction used for all admin mutations — required to capture created.id for AdminAuditLog.resource_id
- [Phase 06-admin-panel-crm P01]: Admin UI pages as 'use client' components — simpler interactivity model for CRUD operations
- [Phase 06-admin-panel-crm]: Server+client split for edit page — server fetches person, _EditPersonClient handles form/redirect (avoids self-fetch cookie issues)
- [Phase 06-admin-panel-crm]: CRM-05 duplicate flag pragmatic impl — PATCH person.notes prepending "DUPLICATE FLAG: {note}" (no separate DB field in v1)
- [Phase 06-admin-panel-crm]: Anonymized persons masked at API layer — name/email/phone/notes returned as null; display_name='Anonymous Constituent' added to response
- [Phase 06-admin-panel-crm P02]: GET /api/admin/me added for frontend self-identification — needed by admin users page to disable deactivate-self button
- [Phase 06-admin-panel-crm P02]: Interactive prisma.$transaction for create user + generate API key — sequential form cannot reference new record ID in audit log
- [Phase 06-admin-panel-crm P02]: Admin login redirects to /staff/tickets first — admin users navigate to /admin via URL; no separate admin-only landing needed
- [Phase 06-admin-panel-crm P04]: Tailwind-only inline modals for merge + anonymize — no shadcn/ui components installed; consistent with existing PersonDetail flag dialog pattern
- [Phase 06-admin-panel-crm P04]: toDelete TicketPerson rows deleted in same merge transaction — prevents @@unique([ticket_id, person_id]) constraint violation
- [Phase 06-admin-panel-crm P04]: Pre-fetch ticketLinks before anonymize transaction — Prisma $transaction does not support mid-transaction reads; query outside then include creates in ops array
- [Phase 07-reports-metrics-dashboard P01]: Prisma.sql fragment composition for geo-density status filter — Zod-validated enum selects pre-built literal; user string never interpolated into SQL
- [Phase 07-reports-metrics-dashboard P01]: COALESCE(d.id, 'unassigned') in volume-by-department — unassigned tickets grouped under synthetic id rather than NULL for consistent response shape
- [Phase 07-reports-metrics-dashboard P01]: vitest.config.ts added — no vitest config existed; needed @/ alias to resolve unit test imports
- [Phase 07-reports-metrics-dashboard P02]: async searchParams (Promise) in reports page — Next.js 15 App Router server component requirement
- [Phase 07-reports-metrics-dashboard P02]: DensityMap wrapped dynamic(ssr:false) in page.tsx — Leaflet accesses window at init; SSR would throw
- [Phase 07-reports-metrics-dashboard P02]: escapeHtml() in DensityMap popup — constituent-supplied address_snippet treated as untrusted (T-07-10)
- [Phase 07-reports-metrics-dashboard P02]: components/ui/button + card + lib/utils.ts created — no shadcn components existed; Rule 3 auto-fix for TS2307 blocking errors

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-07-09T04:15:00Z
Stopped at: Completed 07-02-PLAN.md (Phase 7 final plan — v1 complete)
Resume file: None
