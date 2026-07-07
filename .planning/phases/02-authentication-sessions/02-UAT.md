---
status: complete
phase: 02-authentication-sessions
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md
started: 2026-07-07T23:40:35Z
updated: 2026-07-07T23:43:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Login with valid credentials
expected: Navigate to /login, enter staff / Staff1234!seed, click Sign In — redirected to /staff/tickets with "Staff Console" heading visible, no error shown
result: issue
reported: "The login form loads but Sign In returns the auth error URL — upstream: error sending request for url (http://10.42.2.156:7777/preview/3000/api/auth/error)"
severity: blocker

### 2. Invalid credentials show generic error
expected: On /login, enter a wrong password (e.g. wrong123). The page shows "Invalid username or password" — not a 404, not a hint about which field was wrong
result: issue
reported: "upstream: error sending request for url (http://10.42.2.156:7777/preview/3000/api/auth/error) — same auth error URL as Test 1, even with wrong credentials"
severity: blocker

### 3. Session persists across browser refresh
expected: After logging in as staff, press F5 or reload — you remain on /staff/tickets (no redirect to /login)
result: skipped
reason: Cannot test — login is blocked by Auth.js error (Tests 1 & 2)

### 4. Logout clears session
expected: While logged in, navigate to /api/auth/signout and confirm — session cookie is cleared. Navigating to /staff/tickets redirects back to /login
result: skipped
reason: Cannot test — login is blocked by Auth.js error (Tests 1 & 2)

### 5. Unauthenticated redirect to login
expected: Without a session (clear cookies or private window), navigate to /staff/tickets — redirected to /login?callbackUrl=%2Fstaff%2Ftickets with the login form visible
result: skipped
reason: User skipped

### 6. Staff role blocked from admin routes
expected: Log in as staff (staff / Staff1234!seed), then navigate to /admin/users — redirected to /staff/tickets (not shown an admin page, not a 404)
result: skipped
reason: Cannot test — login is blocked by Auth.js error (Tests 1 & 2)

### 7. Admin can access staff and admin routes
expected: Log in as admin (admin / Admin1234!seed or similar seeded admin password), navigate to /staff/tickets (loads), then navigate to /admin/users — loads without redirect
result: skipped
reason: Cannot test — login is blocked by Auth.js error (Tests 1 & 2)

### 8. Self-service password change
expected: While logged in as staff, navigate to /staff/account/password — form loads with current password, new password, confirm fields. Submit a valid new password — success message shown and redirected to /login to re-authenticate
result: skipped
reason: Cannot test — login is blocked by Auth.js error (Tests 1 & 2)

## Summary

total: 8
passed: 0
issues: 2
pending: 0
skipped: 6

## Gaps

- truth: "Seeded staff user can log in at /login with valid credentials and land on /staff/tickets"
  status: failed
  reason: "User reported: The login form loads but Sign In returns the auth error URL — upstream: error sending request for url (http://10.42.2.156:7777/preview/3000/api/auth/error)"
  severity: blocker
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Invalid credentials on /login show generic error message 'Invalid username or password'"
  status: failed
  reason: "User reported: upstream: error sending request for url (http://10.42.2.156:7777/preview/3000/api/auth/error) — same auth error URL as Test 1, even with wrong credentials"
  severity: blocker
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
