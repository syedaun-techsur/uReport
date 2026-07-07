---
pivota_spec_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 02-authentication-sessions-03-PLAN.md
last_updated: "2026-07-07T23:29:14.229Z"
last_activity: "2026-07-07 — 02-01 complete: Auth.js credentials provider, Zod schemas, login page, Playwright E2E tests"
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 10
  completed_plans: 6
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-06)

**Core value:** City constituents can report municipal issues and staff can manage the full ticket lifecycle — all from one responsive, accessible web app running as a single Kubernetes pod with a Postgres sidecar.
**Current focus:** Phase 2 — Authentication & Sessions

## Current Position

Phase: 2 of 7 (Authentication & Sessions) — IN PROGRESS
Plan: 1 of 2 in current phase (02-01 complete)
Status: Auth.js v5 credentials provider + login UI + E2E tests done; ready for 02-02 (middleware guards)
Last activity: 2026-07-07 — 02-01 complete: Auth.js credentials provider, Zod schemas, login page, Playwright E2E tests

Progress: [█████░░░░░] 50%

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-07-07T23:29:14.228Z
Stopped at: Completed 02-authentication-sessions-03-PLAN.md
Resume file: None
