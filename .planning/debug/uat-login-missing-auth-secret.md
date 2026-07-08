---
status: diagnosed
trigger: "UAT gap: staff login fails with upstream proxy error — AUTH_SECRET env var not set"
created: 2026-07-08T00:00:00Z
updated: 2026-07-08T00:00:00Z
---

## Current Focus

hypothesis: AUTH_SECRET is never injected into the sandbox environment because no .env file exists and no env-injection mechanism is in place for the dev/sandbox runtime
test: confirmed via printenv (no AUTH_SECRET), glob (no .env files), and reading migrate-and-start.js
expecting: fix requires creating a .env.local with AUTH_SECRET set to a generated secret
next_action: return_diagnosis

## Symptoms

expected: Staff user logs in with valid credentials and is redirected to /staff/tickets
actual: Browser shows upstream proxy error; dev log shows [auth][error] MissingSecret from Auth.js
errors: "MissingSecret" from Auth.js v5; upstream error at /api/auth/error
reproduction: Attempt login at /login with any credentials
started: Always — AUTH_SECRET has never been configured in this sandbox

## Eliminated

- hypothesis: lib/auth.ts has a fallback for missing AUTH_SECRET
  evidence: auth.ts passes no `secret` option to NextAuth(); Auth.js v5 reads AUTH_SECRET from env exclusively with no fallback
  timestamp: 2026-07-08

- hypothesis: migrate-and-start.js sets up AUTH_SECRET
  evidence: migrate-and-start.js line 44 validates that AUTH_SECRET is present and calls process.exit(1) if missing — it does NOT generate or inject it
  timestamp: 2026-07-08

- hypothesis: A .env or .env.local file exists with AUTH_SECRET
  evidence: glob for .env* returns no files; ls confirms no env files in project root
  timestamp: 2026-07-08

- hypothesis: next.config.ts or another config injects AUTH_SECRET
  evidence: next.config.ts contains only origin/header config; no auth secret handling
  timestamp: 2026-07-08

## Evidence

- timestamp: 2026-07-08
  checked: lib/auth.ts
  found: NextAuth() called with no `secret:` option — Auth.js v5 reads AUTH_SECRET from process.env exclusively
  implication: If AUTH_SECRET is absent from env, Auth.js throws MissingSecret on every request

- timestamp: 2026-07-08
  checked: scripts/migrate-and-start.js line 44
  found: Validates AUTH_SECRET is present and exits fatally if missing — but does NOT generate or inject it
  implication: The startup script guards against a missing secret but provides no mechanism to supply one; the sandbox must have it pre-configured

- timestamp: 2026-07-08
  checked: .env* files (glob)
  found: Zero .env files exist in the project (.env, .env.local, .env.example all absent)
  implication: No env file to define AUTH_SECRET; no documented default value either

- timestamp: 2026-07-08
  checked: next.config.ts
  found: No auth-related config; only CORS origins and security headers
  implication: next.config.ts is not the source of the problem

- timestamp: 2026-07-08
  checked: printenv (AUTH_SECRET, NEXTAUTH_SECRET, NEXT_*)
  found: No auth secret variables present in sandbox process environment
  implication: Confirms AUTH_SECRET is entirely absent — not just wrong, not expired, never set

## Resolution

root_cause: AUTH_SECRET is never provided to the sandbox runtime — no .env file exists, no env-injection mechanism is in place, and lib/auth.ts has no fallback — so Auth.js v5 throws MissingSecret on every request, crashing the auth route and returning an upstream proxy error to the browser
fix: Create a .env.local file at the project root containing AUTH_SECRET=<generated-secret> so Auth.js can initialise and the startup script passes its guard check
verification: pending
files_changed: [".env.local"]
