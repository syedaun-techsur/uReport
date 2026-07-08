---
phase: 02-authentication-sessions
plan: "07"
subsystem: auth
tags: [next-auth, prisma, credentials, samesite, cookies, login, e2e]

# Dependency graph
requires:
  - phase: 02-authentication-sessions
    provides: "Auth.js credentials provider, lib/auth.ts, schemas/auth.ts, login form from 02-01"
provides:
  - "Email-or-username login via Prisma OR query (case-insensitive)"
  - "SameSite=None; Secure on all three Auth.js cookies (sessionToken, csrfToken, callbackUrl)"
  - "Login form field renamed to identifier with 'Username or email' label"
  - "E2E tests updated to use identifier aria-label and email login test added"
affects: [auth, login, session, cookies, e2e]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma OR query for dual identifier lookup (username | email, both mode:insensitive)"
    - "Auth.js cookies override — all three cookies (sessionToken/csrfToken/callbackUrl) set to sameSite:none + secure:true; only sessionToken is httpOnly"

key-files:
  created: []
  modified:
    - schemas/auth.ts
    - lib/auth.ts
    - app/login/page.tsx
    - e2e/auth-login.spec.ts

key-decisions:
  - "SameSite=None; Secure applied unconditionally (not gated on NODE_ENV=production) — required for preview iframe; Pivota preview always runs over HTTPS"
  - "csrfToken and callbackUrl cookies deliberately NOT httpOnly — Auth.js client-side signIn() must JS-read the CSRF token; httpOnly on those breaks every sign-in"
  - "identifier field max length increased from 100 to 200 — email addresses can be longer than typical usernames"

patterns-established:
  - "OR Prisma lookup pattern: { OR: [{ username: { equals: id, mode: insensitive } }, { email: { equals: id, mode: insensitive } }] }"
  - "Auth.js cross-site cookie pattern: override sessionToken+csrfToken+callbackUrl with sameSite:none, secure:true"

# Metrics
duration: 2min
completed: 2026-07-08
---

# Phase 2 Plan 7: Email-or-Username Login and SameSite=None Cookie Fix Summary

**Email-OR-username Prisma lookup and all three Auth.js cookies overridden to SameSite=None;Secure, unblocking login in the Pivota preview iframe**

## Performance

- **Duration:** 2 min
- **Started:** 2026-07-08T02:32:15Z
- **Completed:** 2026-07-08T02:34:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `authorize()` now matches users by `username` OR `email` (both case-insensitive) via Prisma OR query — UAT Test 2 root cause fixed
- All three Auth.js cookies (`sessionToken`, `csrfToken`, `callbackUrl`) overridden to `sameSite: 'none'`, `secure: true` — UAT Tests 4+6 root cause fixed
- Login form field renamed `username` → `identifier` with label "Username or email"; `signIn()` call updated to pass `identifier:` 
- E2E tests updated: all `aria-label="Username or email"` selectors, `STAFF_PASSWORD` default corrected to `Staff1234!seed`, new email login test added using `admin@example.com`

## Task Commits

Each task was committed atomically:

1. **Task 1: Update LoginSchema + authorize() for email-OR-username and SameSite=None cookies** - `cf9d2f9` (feat)
2. **Task 2: Update login form and E2E tests for identifier field + email login** - `b960a04` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `schemas/auth.ts` — LoginSchema field renamed `username` → `identifier` (min 1, max 200)
- `lib/auth.ts` — credentials config, OR Prisma query in authorize(), three-cookie SameSite=None override
- `app/login/page.tsx` — form field, label, aria-label, signIn call, error display all use `identifier`
- `e2e/auth-login.spec.ts` — all selectors updated, STAFF_PASSWORD corrected, email login test added

## Decisions Made
- **SameSite=None unconditionally:** not gated on `NODE_ENV === 'production'` because SameSite=None _requires_ Secure and the Pivota preview always runs over HTTPS
- **csrfToken/callbackUrl NOT httpOnly:** Auth.js client-side `signIn()` reads the CSRF token via JavaScript; `httpOnly: true` on csrfToken would break every sign-in with a CSRF mismatch
- **identifier max 200:** email addresses can exceed 100 chars; consistent with password field max

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- AUTH-01 (email-or-username login) and root causes of UAT Tests 2, 4, 6 are fixed
- AUTH-02 (session persistence) and AUTH-03 (logout) foundation is intact
- E2E tests are updated and ready for the verify phase to run against the live app
- No blockers for Phase 3

## Self-Check: PASSED

All key files verified present on disk. Both task commits (cf9d2f9, b960a04) verified in git history.

---
*Phase: 02-authentication-sessions*
*Completed: 2026-07-08*
