---
status: diagnosed
trigger: "UAT gap: unauthenticated /staff/tickets returns 200 instead of redirect to /login — AUTH_SECRET not set"
created: 2026-07-08T00:00:00Z
updated: 2026-07-08T00:00:00Z
---

## Current Focus

hypothesis: AUTH_SECRET missing causes Auth.js getSession() to return a JSON error response ({message, status:500}) instead of null. handleAuth() in next-auth then calls JSON.parse on that 500 response body setting auth = {message: "There was a problem..."} (truthy), so the userMiddlewareOrRoute callback receives req.auth as a truthy non-null object, bypassing the !session guard.
test: traced code path through @auth/core Auth() → assertConfig → MissingSecret → Response.json({message}, {status:500}), then next-auth handleAuth() sessionResponse.json() = {message:...}, auth = truthy object, guard `if (!session)` is false
expecting: confirmed root cause
next_action: return diagnosis

## Symptoms

expected: GET /staff/tickets (no cookies) → 302 redirect to /login?callbackUrl=/staff/tickets
actual: GET /staff/tickets (no cookies) → 200 with Staff Console page content, no redirect
errors: "[auth][error] MissingSecret" repeated in dev logs
reproduction: curl GET /staff/tickets without session cookie, AUTH_SECRET env var unset
started: AUTH_SECRET was never set in sandbox

## Eliminated

- hypothesis: try/catch in middleware.ts swallows error
  evidence: middleware.ts has no try/catch at all; auth() is called via export default auth(callback) pattern
  timestamp: 2026-07-08

- hypothesis: middleware matcher not matching /staff/tickets
  evidence: config.matcher includes '/staff/:path*' which matches /staff/tickets
  timestamp: 2026-07-08

- hypothesis: auth() throws synchronously and Next.js falls through
  evidence: auth() returns a function via initAuth; that function calls handleAuth which awaits getSession; getSession calls Auth() which catches MissingSecret via assertConfig and returns Response.json({message}, {status:500}) — never throws
  timestamp: 2026-07-08

## Evidence

- timestamp: 2026-07-08
  checked: middleware.ts
  found: Uses `export default auth(callback)` pattern with no try/catch; guard is `if (!session)` where session = req.auth
  implication: If req.auth is truthy for any reason, the redirect is skipped

- timestamp: 2026-07-08
  checked: node_modules/@auth/core/src/lib/utils/assert.ts lines 100-101
  found: assertConfig returns `new MissingSecret(...)` (not throws) when `!options.secret?.length`
  implication: Auth() receives this error object and handles it internally

- timestamp: 2026-07-08
  checked: node_modules/@auth/core/src/index.ts lines 114-130
  found: When assertConfig returns an error AND action is NOT in htmlPages set ('signin','signout','error','verify-request') OR method is not GET, Auth() returns `Response.json({message: "There was a problem..."}, {status: 500})`
  implication: The session action triggered by middleware's getSession() call is not in htmlPages; it returns a 500 JSON response

- timestamp: 2026-07-08
  checked: node_modules/next-auth/src/lib/index.ts handleAuth() function
  found: `const sessionResponse = await getSession(request.headers, config)` then `const auth = await sessionResponse.json()` — auth is set to the parsed JSON body of whatever getSession returns
  implication: When MissingSecret fires, auth = {message: "There was a problem with the server configuration..."} — a truthy non-null object

- timestamp: 2026-07-08
  checked: next-auth handleAuth() userMiddlewareOrRoute branch
  found: `augmentedReq.auth = auth` sets req.auth to the truthy error object, then calls userMiddlewareOrRoute (our middleware callback)
  implication: In middleware.ts, `const session = req.auth` is truthy, so `if (!session)` is false, redirect is skipped, request passes through

## Resolution

root_cause: When AUTH_SECRET is not set, @auth/core's assertConfig() returns a MissingSecret error causing Auth() to return a 500 JSON response body ({message: "..."}); next-auth's handleAuth() then calls .json() on that response and assigns the resulting truthy object to req.auth, making the middleware's `if (!session)` guard evaluate to false and allowing unauthenticated requests to pass through unredirected.
fix: Set AUTH_SECRET environment variable in the sandbox/.env so Auth.js can initialize correctly; the middleware guard logic itself is correct and will work once AUTH_SECRET is present
verification: not yet applied (diagnosis-only mode)
files_changed: []
