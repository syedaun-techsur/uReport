---
phase: 01-k8s-scaffold-data-foundation
plan: "01"
subsystem: infra
tags: [next.js, typescript, prisma, postgres, tailwind, next-auth, leaflet, vitest, playwright]

# Dependency graph
requires: []
provides:
  - "package.json with all runtime + dev dependencies (Next.js 15, React 19, Prisma 6, next-auth 5 beta, Leaflet, Tailwind v4)"
  - "tsconfig.json with Next.js 15 bundler module resolution"
  - "next.config.ts (NO X-Frame-Options, Pivota iframe safe)"
  - "infrastructure.json declaring postgres sidecar on port 3000"
  - "app/layout.tsx root layout with Tailwind v4 globals"
  - "types/domain.ts with all core domain interfaces (TechArch §4.2)"
  - "types/auth.ts extending NextAuth session types (TechArch §4.5)"
  - "scripts/migrate-and-start.js: K8s boot entrypoint with DB retry + prisma migrate deploy"
  - "lib/prisma.ts: PrismaClient singleton"
  - "lib/logger.ts: structured JSON logger"
  - "docker-compose.legacy.yml (neutralized legacy MySQL compose)"
affects:
  - "01-02 (Prisma schema — needs lib/prisma.ts + package.json prisma CLI)"
  - "01-03 (health endpoints — needs Next.js app scaffold)"
  - "All subsequent plans in phases 1-7 (depend on lib/prisma.ts export, lib/logger.ts)"

# Tech tracking
tech-stack:
  added:
    - "next@^15.0.0 (App Router, React 19)"
    - "react@^19.0.0, react-dom@^19.0.0"
    - "@prisma/client@^6.0.0 + prisma@^6.0.0"
    - "next-auth@5.0.0-beta.31 (Auth.js v5)"
    - "bcryptjs@^2.4.3, zod@^3.23.0, pg@^8.12.0"
    - "leaflet@^1.9.4, react-leaflet@^4.2.1, leaflet.markercluster@^1.5.3"
    - "recharts@^2.12.0, react-hook-form@^7.52.0, @hookform/resolvers@^3.9.0"
    - "@tanstack/react-table@^8.19.0, lucide-react@^0.447.0"
    - "class-variance-authority@^0.7.0, clsx@^2.1.1, tailwind-merge@^2.5.0"
    - "tailwindcss@^4.0.0, @tailwindcss/postcss@^4.0.0, tailwindcss-animate@^1.0.7"
    - "vitest@^2.1.0, @testing-library/react@^16.0.0, @vitejs/plugin-react@^4.3.0"
    - "playwright@^1.47.0, @playwright/test@^1.47.0"
    - "typescript@^5.5.0, tsx@^4.19.0, shadcn@latest"
  patterns:
    - "PrismaClient singleton via globalThis (hot-reload safe in Next.js dev)"
    - "Structured JSON stdout logger with LOG_LEVEL env control"
    - "K8s boot entrypoint: validate env → wait for DB → migrate → start"
    - "Tailwind v4 import syntax (@import 'tailwindcss')"

key-files:
  created:
    - "package.json"
    - "tsconfig.json"
    - "next.config.ts"
    - "infrastructure.json"
    - "app/layout.tsx"
    - "app/globals.css"
    - "types/domain.ts"
    - "types/auth.ts"
    - "scripts/migrate-and-start.js"
    - "lib/prisma.ts"
    - "lib/logger.ts"
  modified:
    - ".gitignore (added !scripts/ exception for migrate-and-start.js)"
    - "docker-compose.yml → docker-compose.legacy.yml (neutralized)"

key-decisions:
  - "No X-Frame-Options header in next.config.ts — Pivota Preview embeds app in iframe (INFRA-07)"
  - "next.config uses .ts extension — required by Next.js 15+"
  - "0.0.0.0 binding in migrate-and-start.js — K8s health probes require IPv4"
  - "next-auth@5.0.0-beta.31 instead of ^5.0.0 — v5 only available as beta tag"
  - "npm install --legacy-peer-deps — react-leaflet@4.2.1 hasn't shipped React 19 peer dep support yet"
  - "docker-compose.legacy.yml neutralization — legacy MySQL compose was causing platform to provision MySQL sidecar instead of Postgres"
  - "Added !scripts/ gitignore exception — legacy *-*.js pattern was blocking migrate-and-start.js"

patterns-established:
  - "lib/prisma.ts singleton pattern: all DB access goes through this export"
  - "lib/logger.ts interface: { info, error, warn, debug } — structured JSON, no PII"
  - "scripts/migrate-and-start.js as K8s pod entrypoint: validate → wait → migrate → serve"

# Metrics
duration: 3min
completed: 2026-07-07
---

# Phase 1 Plan 01: K8s Scaffold — Next.js 15 Project Foundation Summary

**Greenfield Next.js 15 scaffold with Prisma 6, structured logger, K8s boot entrypoint, Tailwind v4, and postgres sidecar declaration — all runtime dependencies installed**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-07T16:29:52Z
- **Completed:** 2026-07-07T16:33:32Z
- **Tasks:** 2
- **Files modified:** 13 (11 created, 2 modified)

## Accomplishments

- Created complete Next.js 15 project scaffold alongside legacy PHP code (no legacy files touched)
- Installed 508 npm packages — all runtime + dev dependencies resolved
- Created K8s-native boot entrypoint: validates env, retries DB with exponential backoff, runs `prisma migrate deploy`, spawns `next start -H 0.0.0.0 -p 3000`
- Established Prisma singleton pattern (`lib/prisma.ts`) and structured JSON logger (`lib/logger.ts`)
- Neutralized legacy MySQL docker-compose to allow Postgres sidecar provisioning via `infrastructure.json`

## Task Commits

Each task was committed atomically:

1. **Task 1: Project scaffold** - `b71834c` (feat)
2. **Task 2: Boot entrypoint + Prisma singleton + structured logger** - `927adaf` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `package.json` — All runtime + dev dependencies; scripts: build, start, dev, type-check, test
- `tsconfig.json` — Next.js 15 TypeScript config, bundler module resolution, strict mode
- `next.config.ts` — Next.js 15 config; NO X-Frame-Options; safe security headers only
- `infrastructure.json` — Pivota sidecar declaration: postgres on port 3000
- `app/layout.tsx` — Root App Router layout with metadata
- `app/globals.css` — Tailwind v4 import
- `types/domain.ts` — Core domain interfaces: TicketSummary, TicketDetail, PersonRecord, etc. (TechArch §4.2)
- `types/auth.ts` — NextAuth session type augmentation: id, username, role, department_id, token_version
- `scripts/migrate-and-start.js` — K8s pod boot entrypoint: env validation → DB retry → migrations → next start
- `lib/prisma.ts` — PrismaClient singleton (globalThis pattern for dev hot-reload safety)
- `lib/logger.ts` — Structured JSON stdout logger with LOG_LEVEL control, no PII fields
- `.gitignore` — Added `!scripts/` exception (blocked by legacy `*-*.js` pattern)
- `docker-compose.legacy.yml` — Renamed from docker-compose.yml to neutralize legacy MySQL sidecar detection

## Decisions Made

1. **No X-Frame-Options in next.config.ts** — Pivota Preview embeds app in iframe; adding this header would break the preview
2. **next.config uses `.ts` extension** — Required by Next.js 15+; `.js` would not work
3. **0.0.0.0 binding** — K8s health probes connect via IPv4; `localhost` can resolve to `::1` and break the proxy
4. **next-auth@5.0.0-beta.31** — The `^5.0.0` version spec doesn't resolve to any published package; v5 ships as beta tags only
5. **--legacy-peer-deps for install** — react-leaflet@4.2.1 declares `react: ^18` peer dep; React 19 shipped but react-leaflet hasn't updated yet
6. **docker-compose.legacy.yml neutralization** — Legacy compose declared MariaDB; platform was provisioning MySQL sidecar instead of Postgres; `infrastructure.json` now correctly drives sidecar selection
7. **!scripts/ gitignore exception** — Legacy PHP `.gitignore` had `*-*.js` to exclude SASS/build artifacts; this pattern also matched `migrate-and-start.js`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Neutralized legacy docker-compose.yml to prevent MySQL sidecar**
- **Found during:** Pre-task analysis (DB contract resolution)
- **Issue:** Existing `docker-compose.yml` declared MariaDB service; platform was provisioning `sidecar-mysql` / injecting `mysql://ureport...` DATABASE_URL instead of Postgres
- **Fix:** `git mv docker-compose.yml docker-compose.legacy.yml`; `infrastructure.json` now drives sidecar selection
- **Files modified:** `docker-compose.legacy.yml` (renamed)
- **Committed in:** `b71834c` (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed next-auth version spec (^5.0.0 → 5.0.0-beta.31)**
- **Found during:** Task 1 (`npm install`)
- **Issue:** `npm error notarget No matching version found for next-auth@^5.0.0` — v5 is published only as beta tags
- **Fix:** Updated `package.json` to pin `"next-auth": "5.0.0-beta.31"` (latest stable beta)
- **Files modified:** `package.json`
- **Committed in:** `b71834c` (Task 1 commit)

**3. [Rule 3 - Blocking] Used --legacy-peer-deps for react-leaflet React 19 conflict**
- **Found during:** Task 1 (`npm install`)
- **Issue:** `react-leaflet@4.2.1` declares `peer react: ^18.0.0`; project uses React 19
- **Fix:** Ran `npm install --legacy-peer-deps`; this is a known upstream lag — react-leaflet v5 is in progress
- **Files modified:** `package-lock.json`
- **Committed in:** `b71834c` (Task 1 commit)

**4. [Rule 3 - Blocking] Added !scripts/ gitignore exception for migrate-and-start.js**
- **Found during:** Task 2 (git add scripts/migrate-and-start.js)
- **Issue:** Legacy PHP `.gitignore` pattern `*-*.js` blocked `migrate-and-start.js` from being tracked
- **Fix:** Added `!scripts/` and `!scripts/*.js` exception lines after the `*-*.js` pattern
- **Files modified:** `.gitignore`
- **Committed in:** `927adaf` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (4 blocking)
**Impact on plan:** All 4 auto-fixes were necessary for correctness and to unblock execution. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required. The app uses the platform-injected `DATABASE_URL` and an `AUTH_SECRET` that must be set in the K8s pod environment.

## Next Phase Readiness

- `lib/prisma.ts` exported and ready for Plan 01-02 (Prisma schema definition)
- `package.json` has `prisma@^6.0.0` in devDependencies — `prisma generate` + `prisma migrate deploy` available
- `infrastructure.json` correctly declares postgres sidecar — platform will provision Postgres on next pod start
- `scripts/migrate-and-start.js` wired as `"start"` script — will run migrations at every boot
- All type foundations in `types/domain.ts` + `types/auth.ts` ready for Plan 01-03 and beyond

## Self-Check: PASSED

All 11 created files found on disk. Both task commits (`b71834c`, `927adaf`) verified in git log.

---
*Phase: 01-k8s-scaffold-data-foundation*
*Completed: 2026-07-07*
