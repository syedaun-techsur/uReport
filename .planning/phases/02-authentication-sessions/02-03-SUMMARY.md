---
phase: 02-authentication-sessions
plan: "03"
subsystem: auth
tags: [seed, postgres, pg, boot-script, idempotent]

# Dependency graph
requires:
  - phase: 02-authentication-sessions
    provides: prisma schema with User table; seed.ts with bcrypt-hashed admin/staff users
provides:
  - Auto-seed logic in migrate-and-start.js — seeds users on first boot when table is empty
affects: [auth, sessions, all-auth-tests]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Idempotent boot-time seeding via COUNT query before seed invocation"]

key-files:
  created: []
  modified:
    - scripts/migrate-and-start.js

key-decisions:
  - "Auto-seed on empty DB (user count = 0) rather than requiring SEED_ON_BOOT=true env var — eliminates UAT gap where all 8 auth tests failed on a fresh DB"
  - "Preserve SEED_ON_BOOT=true escape hatch for forced re-seeding in test resets"
  - "Use raw pg Client (not Prisma) for COUNT query — script runs before Next.js process starts, no Prisma singleton available"
  - "Quote 'User' table name to avoid case-sensitivity issues with Postgres"

patterns-established:
  - "Idempotent seeding: check count before seeding so restarts are safe"

# Metrics
duration: 1min
completed: 2026-07-07
---

# Phase 02 Plan 03: Auto-seed on Empty DB Summary

**`migrate-and-start.js` now queries `SELECT COUNT(*)::int AS cnt FROM "User"` after migrations and automatically runs `prisma/seed.ts` when the table is empty — eliminating the UAT gap where all 8 auth tests failed on a fresh database spin-up**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-07T23:28:07Z
- **Completed:** 2026-07-07T23:28:35Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced opt-in `SEED_ON_BOOT=true` gate with automatic seeding when user count is 0
- Seed is idempotent — subsequent boots skip seeding when users already exist
- `SEED_ON_BOOT=true` escape hatch preserved for forced re-seeding (e.g. test resets)
- Used raw `pg` Client (consistent with `waitForDb()` and `detectGeoMode()` patterns in same file)

## Task Commits

Each task was committed atomically:

1. **Task 1: Auto-seed on empty users table** — `5402822` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `scripts/migrate-and-start.js` — Replaced optional `SEED_ON_BOOT` branch with `SELECT COUNT(*)::int AS cnt FROM "User"` check; seeds automatically when count is 0, skips with log when users exist

## Decisions Made

- **Auto-seed when count = 0**: Eliminates the UAT Gap 1 where all 8 auth tests failed because no env var was set on fresh DB spin-ups. The seed script already has correct bcrypt-hashed admin/staff users — it just wasn't being called automatically.
- **Preserve SEED_ON_BOOT=true**: Kept as escape hatch so test infrastructure can force a re-seed without wiping and re-creating the DB.
- **Raw pg Client over Prisma**: The script runs at Node process startup before Next.js/Prisma is initialized; raw `pg` is the correct tool here, consistent with existing patterns in the file.
- **Quoted `"User"` identifier**: Postgres is case-sensitive for unquoted identifiers; Prisma maps models to PascalCase table names by default, so quoting is necessary.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auto-seed is in place; all AUTH-01 through AUTH-04 E2E tests should now find seeded admin/staff users on fresh DB boot
- Phase 02 auth implementation is complete (02-01 Auth.js credentials + login UI, 02-02 middleware guards, 02-03 auto-seed)
- Ready for Phase 03 or verification of Phase 02 auth tests

## Self-Check

- [x] `scripts/migrate-and-start.js` modified with COUNT query and auto-seed logic
- [x] `node --check scripts/migrate-and-start.js` → SYNTAX_OK
- [x] `grep 'SELECT COUNT'` → found at line 59
- [x] `grep 'userCount === 0'` → found at line 62
- [x] `grep 'SEED_ON_BOOT'` → found at lines 62, 63
- [x] `grep 'seed\.ts'` → found at line 64
- [x] Commit `5402822` exists

## Self-Check: PASSED

---
*Phase: 02-authentication-sessions*
*Completed: 2026-07-07*
