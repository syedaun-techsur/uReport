---
pivota_spec_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 05-02-PLAN.md
last_updated: "2026-07-08T20:05:04.383Z"
last_activity: "2026-07-08 — 04-01 complete: Open311 library layer built and tested"
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 26
  completed_plans: 20
  percent: 94
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-06)

**Core value:** City constituents can report municipal issues and staff can manage the full ticket lifecycle — all from one responsive, accessible web app running as a single Kubernetes pod with a Postgres sidecar.
**Current focus:** Phase 4 — Open311 GeoReport v2 API

## Current Position

Phase: 4 of 7 (Open311 GeoReport v2 API) — IN PROGRESS
Plan: 1 of 1 completed (04-01 done; 04-02 next)
Status: Phase 4 Plan 1 complete — Open311 types, Zod schemas, rate limiter, field mapper, XML serializer, API key verifier + 28 Vitest tests all passing
Last activity: 2026-07-08 — 04-01 complete: Open311 library layer built and tested

Progress: [█████████░] 94%

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-07-08T20:05:04.381Z
Stopped at: Completed 05-02-PLAN.md
Resume file: None
