
---

## F02: Authentication & Role-Based Sessions

**Description:** All staff and admin access is protected by credential-based authentication implemented through Auth.js (NextAuth v5). The system enforces three roles — `public` (unauthenticated), `staff`, and `admin` — with route-level middleware guards on all `/staff/**` and `/admin/**` paths. Sessions are JWT-based (server-signed with `AUTH_SECRET`). No self-registration exists; accounts are created exclusively by admins via F06.

**Terminology:**
- **Auth.js** — NextAuth v5 library integrated into the Next.js App Router via the `auth()` helper and `middleware.ts`.
- **Credentials provider** — Auth.js provider that validates username/password against the local `User` table (bcrypt hash comparison).
- **Session** — A JWT token stored in an httpOnly secure cookie (`__Secure-next-auth.session-token`). Default TTL 8 hours; configurable via `AUTH_SESSION_TTL` env var.
- **Route guard** — Middleware check that redirects unauthenticated requests to `/login?callbackUrl=<original>`.
- **Password hash** — bcrypt hash with work factor 12.

**Sub-features:**
- Login page (`/login`) with username/password form
- Auth.js credentials provider with bcrypt verification
- Role-based route guards (middleware.ts) for `/staff/**` and `/admin/**`
- Role enforcement on all API Route Handlers (server-side `auth()` check)
- Session expiry with automatic redirect to login
- Password change flow for authenticated staff/admin (`/staff/account/password`)
- Admin-initiated password reset (see F06)
- Secure cookie configuration (httpOnly, SameSite=Lax, Secure in production)

**Process — Login:**
1. User navigates to `/login` (or is redirected there from a protected route).
2. User submits username and password.
3. Auth.js credentials provider calls `authorizeUser(username, password)`:
   a. Look up `User` by `username` (case-insensitive).
   b. If user not found or `active = false`, return `null` (Auth.js treats null as failed auth).
   c. Compare submitted password against `password_hash` using `bcrypt.compare`.
   d. If mismatch, return `null`.
   e. Return `{ id, email, username, role, department_id }` on success.
4. Auth.js creates a signed JWT with claims `{ sub: user.id, role, username, department_id, exp }`.
5. Auth.js sets the session cookie. User is redirected to `callbackUrl` (default `/staff/tickets`).

**Process — Route Guard (Middleware):**
1. `middleware.ts` runs on every request matching `/staff/**` and `/admin/**`.
2. Call `auth()` to decode session token.
3. If no valid session → redirect to `/login?callbackUrl=<path>`.
4. If session role is `staff` and path starts with `/admin/` → redirect to `/staff/tickets` with `403` flash.
5. If session role is `admin` → allow all `/staff/**` and `/admin/**`.

**Process — Password Change (Self-Service):**
1. Authenticated user navigates to `/staff/account/password`.
2. User submits `{ current_password, new_password, confirm_password }`.
3. Server verifies `current_password` against stored hash.
4. Server validates `new_password` meets policy (≥12 chars, mixed case, ≥1 digit).
5. Server hashes `new_password` with bcrypt (work factor 12), updates `User.password_hash`.
6. Server invalidates all other sessions for the user by rotating `tokenVersion` (increment stored counter; JWT carries the version and is rejected if stale).

**Inputs:**

*Login:*

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `username` | `string` | Yes | ≤100 chars, trimmed |
| `password` | `string` | Yes | ≤200 chars (raw; never logged) |

*Password change:*

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `current_password` | `string` | Yes | Must match stored hash |
| `new_password` | `string` | Yes | ≥12 chars, ≤200 chars, ≥1 uppercase, ≥1 digit |
| `confirm_password` | `string` | Yes | Must equal `new_password` |

**Outputs:**
- Successful login: HTTP 302 redirect to `callbackUrl`; session cookie set.
- Failed login: `/login` re-rendered with generic error "Invalid username or password" (no field specifics to prevent enumeration).
- Password change success: redirect to `/staff/account` with success toast.

**Validation:**
- Username and password are both required; empty values rejected before hitting DB.
- Password change: new password must not equal current password.
- All password comparisons use `bcrypt.compare` (timing-safe).
- `new_password` policy enforced via Zod regex: `z.string().min(12).regex(/[A-Z]/).regex(/[0-9]/)`.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid credentials | 401 | AUTH_FAILED | "Invalid username or password" |
| Account inactive | 401 | AUTH_FAILED | "Invalid username or password" (same message — no enumeration) |
| Unauthenticated access to /staff/** | 302 | — | Redirect to /login |
| staff role accessing /admin/** | 403 | FORBIDDEN | "You do not have permission to access this page" |
| Expired session | 302 | — | Redirect to /login?callbackUrl=... |
| Current password wrong (change flow) | 422 | WRONG_PASSWORD | "Current password is incorrect" |
| New password policy violation | 422 | PASSWORD_POLICY | "Password must be ≥12 chars with uppercase and digit" |
| Passwords do not match | 422 | PASSWORD_MISMATCH | "Passwords do not match" |

**API Surface (this feature):**
- `POST /api/auth/[...nextauth]` — Auth.js handler (login/logout/session)
- `POST /api/staff/account/password` — password change → see `Y1-api.md §Auth`

**Schema Surface (this feature):** uses `User` table — see `Y0-schema.md §User`.

---
