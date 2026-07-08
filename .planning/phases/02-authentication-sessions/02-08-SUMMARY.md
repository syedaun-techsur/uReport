---
phase: 02-authentication-sessions
plan: "08"
subsystem: infra
tags: [prisma, migrate, seed, start-dev, bash, database]

# Dependency graph
requires:
  - phase: 02-authentication-sessions
    provides: "seed script (prisma/seed.ts) and production migrate-and-start.js pattern"
provides:
  - "start-dev.sh with idempotent migrate+seed pre-launch block in preserved region"
  - "Dev mode DB preparation matching the production npm start path"
affects:
  - "All auth-related E2E tests that depend on a seeded DB at dev server boot"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-launch DB migration+seed block in project-owned preserved region of start-dev.sh"
    - "set-e-safe USER_COUNT=$(node -e ...) || USER_COUNT=0 pattern for bash strict mode"

key-files:
  created: []
  modified:
    - ".pivota/start-dev.sh"

key-decisions:
  - "Block placed BELOW # === END PIVOTA PREAMBLE === so it survives start-dev.sh regeneration by the START-DEV workflow"
  - "DATABASE_URL guard uses ${DATABASE_URL:-} with -n test to safely handle set -u (no abort when var unset)"
  - "USER_COUNT fallback uses || USER_COUNT=0 OUTSIDE command substitution — correct set-e-safe pattern under set -euo pipefail"
  - "migrate exit is non-fatal (|| echo) since no-pending-migrations exits 0 and real failures surface in dev logs"

patterns-established:
  - "Project-owned bash blocks go BELOW # === END PIVOTA PREAMBLE === for regen safety"
  - "set-e-safe command substitution: VAR=$(cmd) || VAR=default (not || echo inside substitution)"

# Metrics
duration: 1min
completed: 2026-07-08
---

# Phase 2 Plan 8: Dev DB Migrate+Seed Pre-launch Block Summary

**Idempotent `prisma migrate deploy` + auto-seed block added to `.pivota/start-dev.sh` preserved region, closing UAT Gap 1 for the `npm run dev` path**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-08T02:32:24Z
- **Completed:** 2026-07-08T02:33:16Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added migrate+seed pre-launch block to `.pivota/start-dev.sh` in the project-owned preserved region (below `# === END PIVOTA PREAMBLE ===`), so it survives `start-dev.sh` regeneration
- Block guards on `DATABASE_URL` being set — completely skipped when no DB available (Daytona self-provided or no sidecar)
- `prisma migrate deploy` runs idempotently before the dev server, ensuring schema is current on fresh sandboxes
- Auto-seeds the database (via `npx tsx prisma/seed.ts`) when the User table is empty, closing the UAT gap where all 8 auth tests failed on a fresh DB
- Uses the correct `set -e`-safe pattern: `USER_COUNT=$(node -e "...") || USER_COUNT=0` — prevents script abort under `set -euo pipefail` when the node query fails
- Production path (`scripts/migrate-and-start.js`) is unmodified

## Task Commits

Each task was committed atomically:

1. **Task 1: Insert migrate+seed pre-launch block into start-dev.sh** - `002cd24` (feat)

## Files Created/Modified

- `.pivota/start-dev.sh` — Migrate+seed pre-launch block added in preserved region (lines 234–258); 26 lines inserted

## Decisions Made

- **Block placed below `# === END PIVOTA PREAMBLE ===`:** The START-DEV workflow regenerates the preamble region (above the marker) but preserves everything below. Placing the block here guarantees it survives regen without any manual intervention.
- **`${DATABASE_URL:-}` with `-n` test:** The `:-` default prevents `set -u` from aborting when `DATABASE_URL` is unset. Clean guard for both native-sidecar and self-provided environments.
- **`USER_COUNT=$(node -e "...") || USER_COUNT=0`:** The `||` is OUTSIDE the command substitution. Under `set -euo pipefail`, a command-substitution failure that exits non-zero aborts the script unless `||` is placed on the assignment itself. This is the correct set-e-safe fallback pattern.
- **Non-fatal `migrate` exit:** `migrate deploy` exits 0 on "no pending migrations" — a `|| echo` makes it non-fatal for real failures too, so the dev server still starts and the failure is visible in the log.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auth UAT Gap 1 closed: `npm run dev` now applies migrations and seeds the DB before Next.js starts on fresh sandboxes
- Staff login flows will work on first dev server boot without requiring a manual seed step
- Production path (`npm start` via `scripts/migrate-and-start.js`) is unchanged and continues to work as before
- Phase 2 complete — all 8 plans done (02-01 through 02-08)

## Self-Check: PASSED

- `.pivota/start-dev.sh` — FOUND ✓
- `02-08-SUMMARY.md` — FOUND ✓
- Commit `002cd24` — FOUND ✓

---
*Phase: 02-authentication-sessions*
*Completed: 2026-07-08*
