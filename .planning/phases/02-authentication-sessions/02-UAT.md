---
status: diagnosed
phase: 02-authentication-sessions
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md]
started: 2026-07-08T01:57:30Z
updated: 2026-07-08T02:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login form renders
expected: Navigate to /login. The page shows a login form with username and password fields and a submit button.
result: pass

### 2. Login with valid credentials
expected: Fill in username "admin@example.com" and password "Staff1234!seed", click Sign in. You are redirected to /staff/tickets showing a staff page.
result: issue
reported: "invalid username/pass"
severity: blocker

### 3. Invalid credentials show generic error
expected: Fill in a wrong username/password and submit. The form shows a single generic error message like "Invalid username or password" — it does NOT redirect to an error page or say which field is wrong.
result: pass

### 4. Session persists across refresh
expected: After logging in successfully, refresh the browser. You remain on /staff/tickets (still logged in), not redirected to /login.
result: issue
reported: "page stays on /login and the screen goes blank"
severity: blocker

### 5. Logout clears session
expected: While logged in, click the "Log out" button visible in the staff layout. After logging out, navigating to /staff/tickets redirects you to /login.
result: skipped
reason: Login broken — can't establish session to test logout

### 6. Unauthenticated access redirects to login
expected: Without logging in (or after logging out), navigate directly to /staff/tickets. You are redirected to /login with a callbackUrl parameter in the URL (e.g. /login?callbackUrl=%2Fstaff%2Ftickets).
result: issue
reported: "i just see a blank white screen again"
severity: blocker

### 7. Staff cannot access admin routes
expected: Log in as a staff user (role=staff). Navigate to /admin/ or /admin/** route. You are redirected away (to /staff/tickets), not given access to the admin area.
result: skipped
reason: Login not testable in embedded Preview iframe due to SameSite cookie issue

### 8. Password change
expected: While logged in as staff, navigate to /staff/account/password. A form with "Current password", "New password", and "Confirm password" fields is shown. Entering correct current password and a valid new password (12+ chars, uppercase, digit) saves successfully and redirects to /login.
result: skipped
reason: Can't log in to reach this page — SameSite cookie issue in Preview iframe

## Summary

total: 8
passed: 2
issues: 3
pending: 0
skipped: 3

## Self-Check

boot: 200
routes_probed: 2 ok / 0 failed
cookie: n/a (client-side signIn() — browser test required for auth cookie)
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: GET /login → 200; login form with username/password fields confirmed in HTML."
  - test: 2
    verdict: skipped (needs human)
    note: "🤖 Auto-check: Login uses client-side signIn() — cannot reproduce over curl. Browser test required. Auth providers endpoint healthy (no MissingSecret). Note: preview is served in a cross-site iframe; if login appears to fail only in the embedded Preview but works in a new tab, the cause is SameSite cookie policy — use 'Open in new tab' to test."
  - test: 3
    verdict: skipped (needs human)
    note: ""
  - test: 4
    verdict: skipped (needs human)
    note: ""
  - test: 5
    verdict: skipped (needs human)
    note: ""
  - test: 6
    verdict: pass
    note: "🤖 Auto-check: GET /staff/tickets (no auth cookies) → 307 redirect to /login?callbackUrl=%2Fstaff%2Ftickets. Middleware is working."
  - test: 7
    verdict: skipped (needs human)
    note: ""
  - test: 8
    verdict: skipped (needs human)
    note: ""

## Gaps

- truth: "A seeded staff/admin user can log in with valid credentials and be redirected to /staff/tickets"
  status: failed
  reason: "User reported: invalid username/pass"
  severity: blocker
  test: 2
  source: user
  root_cause: "authorize() in lib/auth.ts looks up users by username field only; user submitted email address (admin@bloomington.in.gov) which finds no match. Secondary: DB was not yet migrated+seeded when user first tested. The login form label says 'Username' but AUTH-01 requirement says 'email/password' — inconsistency. Fix: update authorize() to accept either username OR email (OR query). Also ensure migrate-and-start.js runs at dev server boot."
  artifacts:
    - path: "lib/auth.ts"
      issue: "authorize() queries WHERE username= only; does not accept email as an alternative login identifier"
    - path: "app/login/page.tsx"
      issue: "Form label says 'Username' but AUTH-01 requirement says email/password login"
  missing:
    - "Update authorize() in lib/auth.ts to do OR lookup: WHERE username=X OR email=X (case-insensitive)"
    - "Update login form label to say 'Username or email' or pick one canonical identifier"
  debug_session: ""

- truth: "After logging in, session persists across browser refresh and user remains on /staff/tickets"
  status: failed
  reason: "User reported: page stays on /login and the screen goes blank"
  severity: blocker
  test: 4
  source: user
  root_cause: "All Auth.js cookies (sessionToken, csrfToken, callbackUrl) use SameSite=Lax. In the cross-site Pivota preview iframe, browsers drop all SameSite=Lax cookies, causing MissingCSRF on login POST and session invisibility on protected routes — creating a redirect loop that renders as a blank screen. lib/auth.ts only overrides sessionToken (still SameSite=Lax); csrfToken and callbackUrl fall back to Auth.js defaults (also SameSite=Lax). Fix: override all three cookies to sameSite:'none', secure:true."
  artifacts:
    - path: "lib/auth.ts"
      issue: "cookies config only overrides sessionToken with sameSite:'lax'; csrfToken and callbackUrl not overridden, both default to SameSite=Lax — all three are dropped in cross-site iframe"
  missing:
    - "In lib/auth.ts cookies config, override sessionToken, csrfToken, and callbackUrl to sameSite:'none', secure:true for Pivota iframe compatibility"
  debug_session: ""

- truth: "Navigating to /staff/tickets without a session redirects to /login with callbackUrl"
  status: failed
  reason: "User reported: i just see a blank white screen again"
  severity: blocker
  test: 6
  source: user
  root_cause: "Same root cause as Test 4: SameSite=Lax cookies dropped in iframe. The 307 redirect to /login IS happening (curl confirms it), but once the browser lands on /login, the CSRF cookie is also dropped so the login form cannot complete — creating a blank redirect loop. This is the same cookie fix as Test 4."
  artifacts:
    - path: "lib/auth.ts"
      issue: "Same as Test 4 — all Auth.js cookies are SameSite=Lax, dropped in cross-site iframe"
  missing:
    - "Same fix as Test 4: override all Auth.js cookies to sameSite:'none', secure:true"
  debug_session: ""

