---
phase: 02-authentication-sessions
plan: "01"
subsystem: auth
tags: [next-auth, auth.js-v5, credentials-provider, bcryptjs, zod, jwt, token-version, react-hook-form, playwright]

# Dependency graph
requires:
  - phase: 01-k8s-scaffold-data-foundation
    plan: "01"
    provides: "lib/prisma.ts PrismaClient singleton, lib/logger.ts structured logger, types/auth.ts NextAuth session types"
  - phase: 01-k8s-scaffold-data-foundation
    plan: "02"
    provides: "User model (username, password_hash, token_version, role, active, department_id) in Prisma schema"
  - phase: 01-k8s-scaffold-data-foundation
    plan: "03"
    provides: "lib/auth.ts stub (replaced), lib/api-response.ts requireSession() (now uses real auth())"
provides:
  - "lib/auth.ts: NextAuth() credentials provider + auth() helper + handlers + signIn + signOut exports"
  - "schemas/auth.ts: LoginSchema + PasswordChangeSchema (Zod)"
  - "app/api/auth/[...nextauth]/route.ts: Auth.js catch-all route handler (GET, POST)"
  - "app/login/page.tsx: login UI with react-hook-form + generic error message"
  - "e2e/auth-login.spec.ts: Playwright E2E tests for login/session/logout flows"
  - "playwright.config.ts: Playwright base config"
affects:
  - "02-02 (middleware route guards need auth() from lib/auth.ts)"
  - "02-03 (password change needs PasswordChangeSchema from schemas/auth.ts)"
  - "All staff/admin routes (phases 5-7) need requireSession() from lib/api-response.ts, which calls auth())"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NextAuth() credentials provider pattern: authorize() returns null for both bad username and bad password (no enumeration)"
    - "token_version invalidation: jwt() callback queries DB on every authenticated request"
    - "signIn('credentials', { redirect: false }) pattern for client-side login without full-page redirect"
    - "JWT strategy with AUTH_SESSION_TTL env-configurable maxAge (default 28800s = 8h)"
    - "httpOnly + SameSite=Lax cookie; Secure only in production"

key-files:
  created:
    - "schemas/auth.ts"
    - "app/api/auth/[...nextauth]/route.ts"
    - "app/login/page.tsx"
    - "e2e/auth-login.spec.ts"
    - "playwright.config.ts"
  modified:
    - "lib/auth.ts (replaced Phase 1 null stub with full Auth.js v5 credentials provider)"

key-decisions:
  - "Credentials-only auth (no OAuth) — staff/admin users are internal, no third-party identity needed"
  - "bcrypt.compare from bcryptjs (not hand-rolled) — work factor from stored hash at seed time"
  - "token_version invalidation on every JWT decode — one DB SELECT per request; accepted for v1 (T-02-06)"
  - "Generic error message 'Invalid username or password' — prevents enumeration (T-02-02)"
  - "Re-structured NextAuth() into named const to allow both handlers export AND individual GET/POST re-exports"

patterns-established:
  - "lib/auth.ts is the auth engine: all phases import auth() from here, never instantiate NextAuth() elsewhere"
  - "route.ts re-exports { GET, POST } from lib/auth.ts (not from handlers.GET — uses named exports)"
  - "Login page pattern: 'use client' + react-hook-form + zodResolver + signIn({ redirect: false }) + router.push(callbackUrl)"

# Metrics
duration: 3min
completed: 2026-07-07
---

# Phase 2 Plan 01: Auth.js v5 Credentials Provider + Login UI Summary

**Auth.js v5 credentials provider with bcrypt verification, token_version JWT invalidation, generic error login page (react-hook-form), and Playwright E2E test suite covering AUTH-01/02/03**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-07T22:33:01Z
- **Completed:** 2026-07-07T22:36:26Z
- **Tasks:** 2
- **Files modified:** 6 (5 created, 1 replaced)

## Accomplishments

- Replaced Phase 1 `lib/auth.ts` null stub with full Auth.js v5 credentials provider: case-insensitive username query, bcrypt.compare, JWT with id/username/role/department_id/token_version fields
- Implemented token_version invalidation: every JWT decode performs `prisma.user.findUnique({ select: { token_version, active } })` — stale sessions (post admin password reset) are immediately rejected
- Created login page with react-hook-form + zodResolver, `signIn({ redirect: false })`, generic error message (prevents credential enumeration), callbackUrl support
- Wrote Playwright E2E tests covering 8 scenarios: form rendering, invalid credentials (generic error, no enumeration), session persistence across reload (AUTH-02), logout clears session (AUTH-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth.js v5 config + Zod schemas + catch-all route** - `1dff727` (feat)
2. **Task 2: Login page + Playwright E2E tests + playwright.config.ts** - `def9b6a` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `lib/auth.ts` — Auth.js v5 credentials provider: NextAuth() with case-insensitive user query, bcrypt.compare, JWT callbacks, token_version invalidation, AUTH_SESSION_TTL, httpOnly SameSite=Lax cookie
- `schemas/auth.ts` — LoginSchema (username/password min-1) + PasswordChangeSchema (new_password min-12 with uppercase+digit regex, confirm_password refine)
- `app/api/auth/[...nextauth]/route.ts` — re-exports `{ GET, POST }` from `@/lib/auth`
- `app/login/page.tsx` — 'use client' login form: react-hook-form, zodResolver(LoginSchema), signIn('credentials', { redirect: false }), generic error, callbackUrl redirect
- `e2e/auth-login.spec.ts` — Playwright tests: form renders, invalid creds generic error, no enumeration in error text, successful login redirect, callbackUrl, session persistence (AUTH-02), logout (AUTH-03)
- `playwright.config.ts` — baseURL + webServer config; reuseExistingServer in dev mode

## Decisions Made

1. **Credentials-only (no OAuth)** — Staff and admin users are internal city employees; no third-party identity provider needed
2. **bcrypt work factor from stored hash** — bcryptjs's `bcrypt.compare` reads the cost factor from the hash string itself; seed script uses factor 12
3. **token_version invalidation on every request** — T-02-06: one DB SELECT per JWT verification; accepted for v1; DB connection pool (Prisma) provides natural throttling; rate limiting is v2
4. **Generic error message** — `authorize()` returns `null` for both "user not found" and "wrong password" cases; login page shows single string "Invalid username or password" — satisfies T-02-01 and T-02-02
5. **Re-structured NextAuth() as named const** — `const nextAuth = NextAuth(...)` then `export const { auth, handlers, signIn, signOut } = nextAuth; export const { GET, POST } = nextAuth.handlers;` — needed because TypeScript couldn't infer GET/POST directly from a destructured `handlers` object re-exported from another module

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Re-structured NextAuth() export to enable GET/POST named re-exports**
- **Found during:** Task 1 (TypeScript type-check)
- **Issue:** `export { GET, POST } from '@/lib/auth'` failed with `TS2305: Module '"@/lib/auth"' has no exported member 'GET'` — the plan's original `export const { auth, handlers, signIn, signOut } = NextAuth({...})` pattern did not expose `GET` and `POST` as named module exports
- **Fix:** Changed to `const nextAuth = NextAuth({...}); export const { auth, handlers, signIn, signOut } = nextAuth; export const { GET, POST } = nextAuth.handlers;`
- **Files modified:** `lib/auth.ts`
- **Verification:** TypeScript type-check: 0 errors; `grep -q "GET, POST" route.ts` PASS
- **Committed in:** `1dff727` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** The fix is necessary for TypeScript to resolve the re-export in the catch-all route. The runtime behavior is identical — `handlers.GET` and `handlers.POST` are the same functions; only the export shape changed.

## Issues Encountered

None — plan executed cleanly after the auto-fix.

## User Setup Required

None — no external service configuration required. The app uses the platform-injected `DATABASE_URL` and the `AUTH_SECRET` environment variable (must be set in K8s pod env for JWT signing — should be a 32+ byte random string).

## Next Phase Readiness

Plan 02-02 (middleware route guards) needs:
- `auth()` export from `lib/auth.ts` ✓
- `signIn`, `signOut` exports from `lib/auth.ts` ✓
- `/login` page at expected URL ✓

Plan 02-03 (password change) needs:
- `PasswordChangeSchema` from `schemas/auth.ts` ✓
- `auth()` for requireSession() in protected route ✓

E2E tests written; execution deferred to verify phase (Playwright requires running app + seeded DB).

## Self-Check: PASSED

All 6 created/modified files found on disk. Both task commits (`1dff727`, `def9b6a`) verified in git log.

---
*Phase: 02-authentication-sessions*
*Completed: 2026-07-07*
