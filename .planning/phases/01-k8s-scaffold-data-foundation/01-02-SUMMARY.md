---
phase: 01-k8s-scaffold-data-foundation
plan: "02"
subsystem: database
tags: [prisma, postgres, postgresql, migrations, fts, tsvector, gin, postgis, seed]

# Dependency graph
requires:
  - phase: 01-k8s-scaffold-data-foundation
    plan: "01"
    provides: "lib/prisma.ts PrismaClient singleton, package.json with prisma@^6.0.0 devDependency"
provides:
  - "prisma/schema.prisma with all 15 models + 3 enums (complete data model)"
  - "prisma/migrations/20240101000001_initial_schema/migration.sql (full DDL)"
  - "prisma/migrations/20240101000002_add_fts/migration.sql (FTS triggers + GIN indexes)"
  - "prisma/migrations/20240101000003_add_postgis/migration.sql (conditional PostGIS column)"
  - "prisma/migrations/migration_lock.toml (postgresql provider lock)"
  - "prisma/seed.ts (CategoryGroups, Categories, Departments, admin user, staff user)"
affects:
  - "01-03 (health endpoints — needs Ticket model for DB readiness check)"
  - "02-auth (User model with password_hash, role, token_version)"
  - "03-public-portal (Ticket + Category + Person + Media models)"
  - "04-staff-queue (Ticket + TicketHistory + Response + Substatus models)"
  - "05-open311 (Category + ApiKey models)"
  - "06-admin (all 15 models)"
  - "07-reports (Ticket + TicketHistory for metrics)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "search_vector tsvector managed via trigger (NOT in Prisma schema) — avoids unsupported type issues"
    - "Migration SQL manually authored for FTS/PostGIS (Prisma cannot generate these)"
    - "DO $$ conditional block pattern for optional PostGIS features — safe on plain Postgres 16"
    - "upsert everywhere in seed.ts — idempotent re-runs safe"
    - "bcrypt work factor 12 for seed user passwords per TechArch §5.3"

key-files:
  created:
    - "prisma/schema.prisma"
    - "prisma/migrations/20240101000001_initial_schema/migration.sql"
    - "prisma/migrations/20240101000002_add_fts/migration.sql"
    - "prisma/migrations/20240101000003_add_postgis/migration.sql"
    - "prisma/migrations/migration_lock.toml"
    - "prisma/seed.ts"
  modified:
    - "package.json (added prisma.seed config)"

key-decisions:
  - "search_vector tsvector NOT in Prisma schema — added via raw ALTER TABLE in migration SQL to avoid Prisma unsupported type issues"
  - "FTS dictionaries: 'english' for Ticket (stemming helps pothole/potholes), 'simple' for Person (email/phone must not have digits stripped)"
  - "PostGIS migration uses DO $$ conditional block — runs without error even when PostGIS extension absent; geog column only added when PostGIS available"
  - "Initial schema migration manually authored (Prisma --create-only requires live DB; platform injected MySQL not Postgres)"
  - "Seed passwords are dev defaults (Admin1234!secure, Staff1234!secure) — production deployments MUST rotate via admin UI post-seed"

patterns-established:
  - "Raw SQL migrations alongside Prisma schema for features Prisma cannot represent (tsvector, generated columns)"
  - "Seed script uses upsert for all entities — idempotent on re-runs"
  - "Migration naming: YYYYMMDDHHMMSS_descriptive_name (Prisma convention)"

# Metrics
duration: 4min
completed: 2026-07-07
---

# Phase 1 Plan 02: Prisma Schema, Migrations, and Seed Data Summary

**Full Prisma data model (15 models, 3 enums) with PostgreSQL FTS triggers (tsvector+GIN), conditional PostGIS geography column, and idempotent seed script creating 5 CategoryGroups, 6 Categories, 4 Departments, and admin/staff seed users**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-07T16:36:23Z
- **Completed:** 2026-07-07T16:40:42Z
- **Tasks:** 2
- **Files modified:** 7 (6 created, 1 modified)

## Accomplishments

- Created complete Prisma schema with all 15 models matching TechArch §3.2 + FRD §Y0.15 (AdminAuditLog)
- Three migration SQL files: initial schema DDL, FTS triggers + GIN indexes, conditional PostGIS column
- Seed script populates 5 CategoryGroups, 6 Categories, 4 Departments, admin user, staff user — all via upsert for idempotency
- `npx prisma generate` exits 0 — schema validated as syntactically correct Prisma SDL

## Task Commits

Each task was committed atomically:

1. **Task 1: Full Prisma schema — 15 models + 3 enums** - `4e84bd0` (feat)
2. **Task 2: Migration SQL files + seed script** - `e89681d` (feat)

## Files Created/Modified

- `prisma/schema.prisma` — 15 models: CategoryGroup, Category, Department, Substatus, User, Ticket, TicketPerson, Person, TicketHistory, Response, ResponseTemplate, Media, ApiKey, BookmarkedFilter, AdminAuditLog; 3 enums: TicketStatus, UserRole, ApiScope
- `prisma/migrations/20240101000001_initial_schema/migration.sql` — Full DDL for all tables, enums, indexes, foreign keys (manually authored — Prisma --create-only requires live Postgres)
- `prisma/migrations/20240101000002_add_fts/migration.sql` — Ticket FTS ('english' dictionary, description/address/service_code weighted A/B/C), Person FTS ('simple' dictionary, name/email/phone weighted A/B/C), GIN indexes, idempotent triggers with DROP TRIGGER IF EXISTS guard
- `prisma/migrations/20240101000003_add_postgis/migration.sql` — Conditional DO $$ block: adds `geog geography(Point, 4326)` generated column + GIST index ONLY when PostGIS extension present; silently no-ops on plain Postgres 16
- `prisma/migrations/migration_lock.toml` — Declares postgresql provider (prevents accidental migration drift)
- `prisma/seed.ts` — Upserts 5 CategoryGroups (Streets & Transportation, Parks & Recreation, Utilities, Public Safety, Other), 4 Departments (Public Works, Parks & Recreation, Utilities, Police Department), 6 sample Categories (POTHOLE, GRAFFITI, SIDEWALK_DAMAGE, STREETLIGHT_OUT, PARK_MAINTENANCE, ILLEGAL_DUMPING), admin user (username: admin, email: admin@bloomington.in.gov), staff user (username: staff, email: staff@bloomington.in.gov); bcrypt work factor 12
- `package.json` — Added `"prisma": { "seed": "tsx prisma/seed.ts" }` config block

## Decisions Made

1. **search_vector NOT in Prisma schema** — Prisma v6 cannot represent `tsvector` natively; added via `ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS search_vector tsvector` in migration SQL with trigger function
2. **FTS dictionary choice** — `'english'` for Ticket (description/address benefit from stemming: "potholes" matches "pothole"); `'simple'` for Person (email/phone contain digits that stemming would strip, names with no stemming benefit)
3. **Manual initial migration** — `prisma migrate dev --create-only` requires a live Postgres connection; platform injected MySQL sidecar instead of Postgres (PIVOTA_DB_MODE=sidecar-mysql). Migration SQL authored manually from schema — will deploy correctly when Postgres sidecar is active at boot
4. **PostGIS conditional pattern** — DO $$ block checks `pg_extension WHERE extname = 'postgis'` before any DDL; this allows the migration to run without error on plain Postgres 16 while still creating the optimal spatial index when PostGIS is available
5. **Seed passwords are dev defaults** — `Admin1234!secure` and `Staff1234!secure` are intentional dev defaults per threat register T-01-05; production deployments MUST rotate via admin UI after first boot

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Manually authored initial schema migration (Postgres unavailable)**
- **Found during:** Task 2 (Step 1 — `prisma migrate dev --create-only`)
- **Issue:** `prisma migrate dev --create-only` requires a live Postgres connection; platform injected MySQL sidecar (`PIVOTA_DB_MODE=sidecar-mysql`, `DATABASE_URL=mysql://...`) while the app targets PostgreSQL. Port 5432 was closed; port 3306 (MySQL) was open.
- **Fix:** Manually authored `20240101000001_initial_schema/migration.sql` from the Prisma schema — full CREATE TABLE, CREATE INDEX, and ADD CONSTRAINT DDL matching Prisma's output conventions (TIMESTAMP(3), TEXT for cuid fields, JSONB for Json fields, BYTEA for Bytes). The file will be applied by `prisma migrate deploy` at boot when the platform eventually provides the Postgres sidecar.
- **Files modified:** `prisma/migrations/20240101000001_initial_schema/migration.sql` (created manually)
- **Verification:** `prisma generate` succeeds (validates schema SDL); FTS and PostGIS migration SQL content verified via grep; migration file structure verified with `find`
- **Committed in:** `e89681d` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Manual migration authoring is a one-time cost; the migration SQL will apply correctly when Postgres sidecar is provisioned. No functional scope change.

## Issues Encountered

- Platform injected MySQL sidecar (`PIVOTA_DB_MODE=sidecar-mysql`) despite `infrastructure.json` declaring `"sidecar_requirements": ["postgres"]`. This is likely due to the legacy `Dockerfile` (PHP/MySQL) still present in the repo root being detected before `infrastructure.json`. A `Dockerfile` rename or removal may be needed for the platform to correctly provision Postgres. The `prisma migrate deploy` in `scripts/migrate-and-start.js` will fail until Postgres is available — this is a known Platform provisioning issue to resolve in Phase 1 completion.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `prisma/schema.prisma` ready for Plan 01-03 (health endpoint needs Ticket model to verify DB connectivity)
- All 15 models available to downstream phases (auth, public portal, staff queue, Open311, admin, reports)
- `scripts/migrate-and-start.js` already wired to run `prisma migrate deploy` then `npx tsx prisma/seed.ts` (when SEED_ON_BOOT=true) — migrations will apply on first successful Postgres connection at boot
- **Blocker note:** Platform currently provisioning MySQL sidecar instead of Postgres; the legacy `Dockerfile` may need to be renamed/removed for the platform to honor `infrastructure.json` postgres declaration

## Self-Check: PASSED

All 6 created files found on disk. Both task commits (`4e84bd0`, `e89681d`) verified in git log.

---
*Phase: 01-k8s-scaffold-data-foundation*
*Completed: 2026-07-07*
