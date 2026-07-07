---
status: diagnosed
phase: 02-authentication-sessions
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md
started: 2026-07-07T22:47:14Z
updated: 2026-07-07T22:53:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login with valid credentials
expected: Navigate to /login, enter seeded staff credentials, click Sign In — redirected to /staff/tickets with an active session
result: issue
reported: "No seed users exist — login fails with invalid credentials. Seed data from previous phase was removed; a fresh DB is spun up between phases."
severity: blocker

### 2. Invalid credentials show generic error
expected: On /login, enter a wrong password. The page shows "Invalid username or password" (no hint whether username or password was wrong)
result: issue
reported: "After typing in the wrong user I see a 404 page not found"
severity: blocker

### 3. Session persists across browser refresh
expected: After logging in, refresh the page — you remain logged in and still see /staff/tickets (no redirect to /login)
result: skipped
reason: Cannot log in due to missing seed data (blocked by Test 1)

### 4. Logout clears session
expected: While logged in, click the logout button/link — redirected to /login, session cookie cleared, /staff/tickets redirects back to /login
result: skipped
reason: Cannot log in due to missing seed data (blocked by Test 1)

### 5. Unauthenticated redirect to login
expected: Without a session, navigate to /staff/tickets — redirected to /login?callbackUrl=%2Fstaff%2Ftickets
result: issue
reported: "404 page not found when navigating to /staff/tickets without a session"
severity: blocker

### 6. Staff role blocked from admin routes
expected: Log in as a staff user and navigate to /admin/** — redirected to /staff/tickets (not shown the admin page)
result: skipped
reason: Cannot log in due to missing seed data (blocked by Test 1)

### 7. Admin can access staff and admin routes
expected: Log in as admin — /staff/tickets loads AND /admin/** loads without redirect
result: skipped
reason: Cannot log in due to missing seed data (blocked by Test 1)

### 8. Self-service password change
expected: Navigate to /staff/account/password while logged in — change password form loads, submit changes password, redirected to /login to re-authenticate
result: skipped
reason: Cannot log in due to missing seed data (blocked by Test 1)

## Summary

total: 8
passed: 0
issues: 3
pending: 0
skipped: 5

## Gaps

- truth: "Seeded staff user can log in at /login with valid credentials and land on /staff/tickets"
  status: failed
  reason: "User reported: No seed users exist — login fails with invalid credentials. Seed data from previous phase was removed; a fresh DB is spun up between phases."
  severity: blocker
  test: 1
  root_cause: "migrate-and-start.js wraps the seed call in `if (process.env.SEED_ON_BOOT === 'true')` — seed is opt-in, not automatic on fresh DB boot; prisma/seed.ts correctly creates admin and staff users but is never called without the env var"
  artifacts:
    - path: "scripts/migrate-and-start.js"
      issue: "Seed is gated behind SEED_ON_BOOT=true env var; not called on fresh DB spin-up in UAT environment"
  missing:
    - "Set SEED_ON_BOOT=true in the UAT/sandbox environment, OR make the seed unconditional on first boot (e.g., check for existing users before seeding)"
  debug_session: ""

- truth: "Invalid credentials on /login show generic error message 'Invalid username or password'"
  status: failed
  reason: "User reported: After typing in the wrong user I see a 404 page not found"
  severity: blocker
  test: 2
  root_cause: "The 404 occurs after a successful login — not on wrong credentials — because the default callbackUrl in app/login/page.tsx is hardcoded to /staff/tickets, which does not yet exist (Phase 5 deliverable). Wrong-credential error display is correct and would not produce a 404."
  artifacts:
    - path: "app/login/page.tsx"
      issue: "Default callbackUrl hardcoded to /staff/tickets (line 17); on successful auth router.push lands on a missing page → 404"
  missing:
    - "app/staff/tickets/page.tsx must exist for the post-login redirect to succeed (Phase 5 scope), OR create a minimal Phase 2 placeholder page"
  debug_session: ""

- truth: "Navigating to /staff/tickets without a session redirects to /login?callbackUrl=..."
  status: failed
  reason: "User reported: 404 page not found when navigating to /staff/tickets without a session"
  severity: blocker
  test: 5
  root_cause: "app/staff/tickets/page.tsx does not exist (Phase 5 deliverable); Next.js returns 404 before the middleware auth-guard can redirect — middleware.ts is correctly implemented and would redirect unauthenticated users once the page file exists"
  artifacts:
    - path: "app/staff/tickets/page.tsx"
      issue: "File does not exist — only app/staff/account/password/page.tsx exists under the staff tree"
  missing:
    - "Create app/staff/tickets/page.tsx (even a minimal placeholder) so middleware can intercept the request and redirect unauthenticated users to /login"
  debug_session: ""
