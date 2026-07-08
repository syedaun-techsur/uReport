---
phase: 02-authentication-sessions
plan: "06"
subsystem: auth
tags: [next-auth, logout, staff-layout, playwright, e2e, auth-03]

# Dependency graph
requires:
  - phase: 02-authentication-sessions
    provides: "AUTH-01 login credential flow and AUTH-02 session persistence already in place"
provides:
  - "app/staff/layout.tsx — shared server component layout for all /staff/** pages with nav containing LogoutButton"
  - "app/staff/LogoutButton.tsx — 'use client' component with data-testid='logout-btn' calling signOut({callbackUrl:'/login'})"
  - "e2e/auth-login.spec.ts — logout E2E test updated to click real UI button instead of navigating to signout API"
affects: [phase-3-ticket-management, phase-5-staff-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Staff layout server component delegates client interactivity to 'use client' child components"
    - "signOut called from next-auth/react (client-safe) not from @/lib/auth (server-only)"

key-files:
  created:
    - app/staff/LogoutButton.tsx
    - app/staff/layout.tsx
  modified:
    - e2e/auth-login.spec.ts

key-decisions:
  - "signOut imported from next-auth/react (client) not @/lib/auth (server-only) — correct client-side path for next-auth v5 beta"
  - "Staff layout is a server component — client interactivity isolated to LogoutButton child component"
  - "No auth check inside layout — middleware already guards /staff/** routes"

patterns-established:
  - "Client action pattern: 'use client' child component for interactive elements inside server layout"
  - "data-testid attributes on interactive UI elements for E2E test targeting"

# Metrics
duration: 1min
completed: 2026-07-08
---

# Phase 2 Plan 06: Staff Layout Logout Button Summary

**Minimal staff layout with LogoutButton ('use client', data-testid='logout-btn', signOut from next-auth/react) closes AUTH-03 gap — E2E logout test now clicks the real UI button**

## Performance

- **Duration:** 1 min
- **Started:** 2026-07-08T01:45:25Z
- **Completed:** 2026-07-08T01:46:36Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `app/staff/LogoutButton.tsx`: `'use client'` component with `data-testid="logout-btn"` calling `signOut({ callbackUrl: '/login' })` from `next-auth/react`
- Created `app/staff/layout.tsx`: server component layout applied automatically to all `/staff/**` pages (tickets, account/password) via Next.js file-system routing
- Updated `e2e/auth-login.spec.ts` logout test to locate and click `[data-testid="logout-btn"]` instead of navigating directly to `/api/auth/signout`
- AUTH-03 gap from VERIFICATION.md is closed: "Log out" UI entry point now exists on every staff page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LogoutButton client component and staff layout** - `3e18868` (feat)
2. **Task 2: Update logout E2E test to click the real logout button** - `a1b0f28` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/staff/LogoutButton.tsx` — `'use client'` component, `data-testid="logout-btn"`, calls `signOut({ callbackUrl: '/login' })` from `next-auth/react`
- `app/staff/layout.tsx` — Server component layout wrapping all `/staff/**` pages with nav containing app name and LogoutButton
- `e2e/auth-login.spec.ts` — Logout test updated: clicks real `[data-testid="logout-btn"]`, asserts visibility before click, confirms redirect to `/login` and session cleared on protected route

## Decisions Made
- `signOut` imported from `next-auth/react` (client sub-path) not from `@/lib/auth` — the lib/auth export is server-only; the react sub-path is the correct client-side import for next-auth v5 beta.31
- Staff layout is a server component — client interactivity isolated entirely to the LogoutButton child component
- No auth check inside the layout — middleware already guards `/staff/**` routes, avoiding duplication

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AUTH-03 gap closed: logout UI button exists on staff pages, E2E test validates the full flow
- Phase 2 AUTH feature set complete (AUTH-01 login, AUTH-02 session persistence, AUTH-03 logout)
- Phase 3 (Ticket Management) can proceed — staff layout provides foundation for Phase 5 full nav replacement

## Self-Check

Checking created files exist and commits are present:

- [x] `app/staff/LogoutButton.tsx` — FOUND
- [x] `app/staff/layout.tsx` — FOUND
- [x] `e2e/auth-login.spec.ts` — MODIFIED (existing file updated)
- [x] Commit `3e18868` — FOUND (feat(02-06): create LogoutButton client component and staff layout)
- [x] Commit `a1b0f28` — FOUND (feat(02-06): update logout E2E test to click real logout button)

## Self-Check: PASSED

---
*Phase: 02-authentication-sessions*
*Completed: 2026-07-08*
