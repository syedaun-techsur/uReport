---
status: resolved
trigger: "Gap 2 — Login form submission causes 404"
created: 2026-07-07T00:00:00Z
updated: 2026-07-07T00:00:00Z
---

## Current Focus

hypothesis: The Auth.js catch-all route exists and is correctly wired; the 404 is caused by the login page redirecting to /staff/tickets which does not exist
test: Check app/api/auth/[...nextauth]/route.ts and app/staff structure
expecting: Route exists but /staff/tickets page is missing
next_action: confirmed — see Gap 3

## Symptoms

expected: Invalid credentials show generic error "Invalid username or password"
actual: 404 page not found after form submission with wrong credentials
errors: HTTP 404
reproduction: Submit login form with invalid credentials
started: Phase 2

## Eliminated

- hypothesis: app/api/auth/[...nextauth]/route.ts is missing
  evidence: File exists at correct path and exports GET and POST from @/lib/auth (1 line re-export)
  timestamp: 2026-07-07T00:00:00Z

- hypothesis: lib/auth.ts does not export GET and POST
  evidence: lib/auth.ts line 125: `export const { GET, POST } = nextAuth.handlers;` — handlers are exported correctly
  timestamp: 2026-07-07T00:00:00Z

- hypothesis: next.config.ts has rewrites that interfere with /api/auth
  evidence: next.config.ts has no rewrites — only security headers configuration
  timestamp: 2026-07-07T00:00:00Z

- hypothesis: login form uses native action= instead of next-auth/react signIn
  evidence: app/login/page.tsx uses `signIn('credentials', { redirect: false })` from next-auth/react — correct pattern
  timestamp: 2026-07-07T00:00:00Z

## Evidence

- timestamp: 2026-07-07T00:00:00Z
  checked: app/login/page.tsx lines 29-48
  found: Uses `signIn('credentials', { redirect: false })` then checks `result?.error` — correctly shows "Invalid username or password" on error
  implication: Error display logic is correct; will never produce a 404 on auth failure

- timestamp: 2026-07-07T00:00:00Z
  checked: app/login/page.tsx line 17
  found: callbackUrl defaults to '/staff/tickets' when no callbackUrl param present
  implication: On SUCCESS, router.push('/staff/tickets') is called — if that page is missing, the 404 appears immediately after successful login, not on wrong-credentials

- timestamp: 2026-07-07T00:00:00Z
  checked: app/api/auth/[...nextauth]/route.ts
  found: Exists and correctly re-exports GET and POST from @/lib/auth
  implication: Auth.js catch-all route is not the problem

- timestamp: 2026-07-07T00:00:00Z
  checked: app/staff/ directory
  found: Only app/staff/account/password/page.tsx exists — no tickets/ subdirectory
  implication: After successful login router.push('/staff/tickets') hits a missing page → 404

## Resolution

root_cause: The login auth infrastructure is correct; the 404 occurs AFTER a successful login (not on wrong credentials) because the login page redirects to /staff/tickets which does not exist yet — the tickets page is a Phase 5 deliverable.
fix: Create app/staff/tickets/page.tsx (Phase 5 task), OR temporarily redirect post-login to an existing page (e.g. /staff/account) for Phase 2 UAT.
verification: N/A — diagnosis only
files_changed: []
