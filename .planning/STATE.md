---
pivota_spec_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 02-06-PLAN.md
last_updated: "2026-07-08T01:47:25.192Z"
last_activity: "2026-07-08 — 02-06 complete: staff layout + LogoutButton + E2E logout test updated (AUTH-03 closed)"
progress:
  total_phases: 7
  completed_phases: 2
  total_plans: 12
  completed_plans: 9
  percent: 75
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-06)

**Core value:** City constituents can report municipal issues and staff can manage the full ticket lifecycle — all from one responsive, accessible web app running as a single Kubernetes pod with a Postgres sidecar.
**Current focus:** Phase 2 — Authentication & Sessions

## Current Position

Phase: 2 of 7 (Authentication & Sessions) — COMPLETE
Plan: 6 of 6 in current phase (all done: 02-01, 02-02, 02-03, 02-04, 02-05, 02-06)
Status: Phase 2 complete — auth provider, middleware, seed fix, staff/tickets placeholder, staff layout + logout button all done
Last activity: 2026-07-08 — 02-06 complete: staff layout + LogoutButton + E2E logout test updated (AUTH-03 closed)

Progress: [████████░░] 75%

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-07-08T01:47:25.191Z
Stopped at: Completed 02-06-PLAN.md
Resume file: None
