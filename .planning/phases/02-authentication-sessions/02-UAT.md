---
status: diagnosed
phase: 02-authentication-sessions
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md
started: 2026-07-07T23:40:35Z
updated: 2026-07-08T00:19:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login with valid credentials
expected: Navigate to /login, enter staff / Staff1234!secure, click Sign In — redirected to /staff/tickets with "Staff Console" heading visible, no error shown
result: issue
reported: "Multiple layers of failure during UAT: (1) AUTH_SECRET missing — auth error URL shown; (2) after fix, middleware crashed (Edge Runtime/Prisma incompatibility) — all sessions rejected; (3) after runtime fix, /staff/tickets returns 404 from preview proxy for the current sandbox instance"
severity: blocker

### 2. Invalid credentials show generic error
expected: On /login, enter a wrong password (e.g. wrong123). The page shows "Invalid username or password" — not a 404, not a hint about which field was wrong
result: issue
reported: "Initially: same auth error URL as Test 1 (AUTH_SECRET missing). After fixes: 'invalid username or password' message appears correctly for wrong credentials — this test is PASS once AUTH_SECRET and middleware runtime issues are resolved"
severity: major

### 3. Session persists across browser refresh
expected: After logging in as staff, press F5 or reload — you remain on /staff/tickets (no redirect to /login)
result: skipped
reason: Cannot test — post-login navigation to /staff/tickets blocked by proxy 404

### 4. Logout clears session
expected: While logged in, navigate to /api/auth/signout and confirm — session cookie is cleared. Navigating to /staff/tickets redirects back to /login
result: skipped
reason: Cannot test — cannot complete login flow due to proxy routing issue

### 5. Unauthenticated redirect to login
expected: Without a session (clear cookies or private window), navigate to /staff/tickets — redirected to /login?callbackUrl=%2Fstaff%2Ftickets with the login form visible
result: skipped
reason: User skipped (proxy 404 for /staff/tickets also affects this test)

### 6. Staff role blocked from admin routes
expected: Log in as staff (staff / Staff1234!secure), then navigate to /admin/users — redirected to /staff/tickets (not shown an admin page, not a 404)
result: skipped
reason: Cannot test — cannot complete login flow

### 7. Admin can access staff and admin routes
expected: Log in as admin (admin / Admin1234!secure), navigate to /staff/tickets (loads), then navigate to /admin/users — loads without redirect
result: skipped
reason: Cannot test — cannot complete login flow

### 8. Self-service password change
expected: While logged in as staff, navigate to /staff/account/password — form loads with current password, new password, confirm fields. Submit a valid new password — success message shown and redirected to /login to re-authenticate
result: skipped
reason: Cannot test — cannot complete login flow

## Summary

total: 8
passed: 0
issues: 2
pending: 0
skipped: 6

## Gaps

- truth: "Seeded staff user can log in at /login with valid credentials and land on /staff/tickets"
  status: failed
  reason: "Multiple blockers surfaced during UAT — see root_cause for full chain"
  severity: blocker
  test: 1
  root_cause: |
    Three layered issues found and partially fixed during UAT:
    1. AUTH_SECRET not in dev environment — Auth.js v5 throws MissingSecret. FIXED: .env.local created with AUTH_SECRET.
    2. middleware.ts running in Edge Runtime — lib/auth.ts calls Prisma (Node.js TCP) inside jwt() callback for token_version invalidation; Edge Runtime has no TCP sockets, middleware silently returns req.auth=null and rejects all sessions. FIXED: added `export const runtime = 'nodejs'` to middleware.ts.
    3. lib/logger.ts uses process.stdout.write which is not Edge Runtime compatible — bundled into middleware via auth.ts import chain. FIXED: changed to console.log.
    4. E2E test passwords used 'Staff1234!seed' but seed.ts uses 'Staff1234!secure'. FIXED in e2e/*.spec.ts.
    5. next.config.ts missing allowedDevOrigins — _next/* asset requests blocked cross-origin from preview proxy. FIXED: added allowedDevOrigins patterns.
    6. REMAINING: preview proxy for some sandbox instances returns 404 for /staff/tickets instead of forwarding to the Next.js app. Server-side: `GET /staff/tickets` correctly returns 200 on localhost. Browser: preview proxy returns 404. This is a proxy routing issue — not an app code defect.
  artifacts:
    - path: ".env.local"
      issue: "AUTH_SECRET now set — was missing"
    - path: "middleware.ts"
      issue: "Edge Runtime → Node.js runtime fix applied; Prisma requires Node.js TCP"
    - path: "lib/logger.ts"
      issue: "process.stdout → console.log for Edge Runtime compatibility"
    - path: "next.config.ts"
      issue: "allowedDevOrigins added for preview proxy cross-origin _next/* assets"
    - path: "app/login/page.tsx"
      issue: "Post-login navigation changed to form GET submit (proxy-compatible)"
    - path: "e2e/auth-login.spec.ts"
      issue: "Password fallback corrected from Staff1234!seed to Staff1234!secure"
    - path: "e2e/auth-middleware.spec.ts"
      issue: "Password fallback corrected"
    - path: "e2e/auth-gap-placeholder.spec.ts"
      issue: "Password fallback corrected"
  missing:
    - "Proxy routing investigation: /staff/tickets returns 404 from preview proxy for some sandbox instances. Server-side (localhost:3000) the route returns 200 correctly. Requires platform-level investigation."
    - "Consider adding /staff/tickets to infrastructure.json or similar routing config if the proxy uses it for route registration"
  debug_session: ""

- truth: "Invalid credentials on /login show generic error message 'Invalid username or password'"
  status: failed
  reason: "Initially same auth error URL (AUTH_SECRET missing). After AUTH_SECRET fix: 'invalid username or password' message correctly shown — this gap is effectively RESOLVED by the AUTH_SECRET fix. Downgraded to major since the error message behavior itself is correct."
  severity: major
  test: 2
  root_cause: "Same root cause as Test 1 gap 1 (AUTH_SECRET missing). Once AUTH_SECRET is set, wrong credentials correctly show 'Invalid username or password' inline. The generic error message code is correct."
  artifacts:
    - path: "lib/auth.ts"
      issue: "MissingSecret thrown before authorize() runs when AUTH_SECRET absent — resolved by .env.local fix"
  missing:
    - "AUTH_SECRET must be present in the sandbox environment for auth to function"
  debug_session: ""
