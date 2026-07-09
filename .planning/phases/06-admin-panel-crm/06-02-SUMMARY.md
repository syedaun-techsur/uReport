---
phase: 06-admin-panel-crm
plan: 02
subsystem: admin-panel
tags: [admin, users, api-keys, audit-log, bcrypt, sha256, token-invalidation]
dependency_graph:
  requires: [prisma/schema.prisma User/ApiKey/AdminAuditLog models, lib/api-response.ts requireSession, lib/prisma.ts]
  provides:
    - GET/POST /api/admin/users
    - PATCH /api/admin/users/[id]
    - POST /api/admin/users/[id]/reset-password
    - GET/POST /api/admin/api-keys
    - PATCH /api/admin/api-keys/[id]
    - GET /api/admin/audit-log
    - GET /api/admin/me
    - app/admin/users page
    - app/admin/api-keys page
    - app/admin/audit-log page
  affects: [Open311 API key verification, Auth.js token_version checks]
tech_stack:
  added: [node:crypto randomBytes/createHash, bcryptjs]
  patterns: [requireSession('admin'), prisma.$transaction interactive form, SHA-256 key hashing, token_version increment invalidation]
key_files:
  created:
    - app/api/admin/users/route.ts
    - app/api/admin/users/[id]/route.ts
    - app/api/admin/users/[id]/reset-password/route.ts
    - app/api/admin/api-keys/route.ts
    - app/api/admin/api-keys/[id]/route.ts
    - app/api/admin/audit-log/route.ts
    - app/api/admin/me/route.ts
    - app/admin/layout.tsx
    - app/admin/page.tsx
    - app/admin/users/page.tsx
    - app/admin/api-keys/page.tsx
    - app/admin/audit-log/page.tsx
    - components/admin/UserForm.tsx
    - components/admin/ApiKeyModal.tsx
    - e2e/admin-users-apikeys.spec.ts
  modified: []
decisions:
  - GET /api/admin/me endpoint added for frontend self-identification (not in original plan) to enable disable-self-deactivation button UX
  - Interactive prisma.$transaction used for create user and generate API key to reference new record ID in audit log
  - app/admin/layout.tsx reuses LogoutButton from staff layout to avoid duplication
metrics:
  duration: ~15min
  completed_date: "2026-07-09"
  tasks_completed: 2
  files_created: 15
---

# Phase 06 Plan 02: Admin User Management + API Keys + Audit Log Summary

## One-Liner

JWT session-invalidating user management + SHA-256-only API key lifecycle + append-only audit log with 6 secured API routes and 3 admin UI pages.

## What Was Built

### Task 1: API Route Handlers (6 routes + 1 helper)

All handlers use `requireSession('admin')` as first operation and create `AdminAuditLog` entries in the same `prisma.$transaction`.

**`GET /api/admin/users`** — Paginated user list with explicit `select` allowlist (no `password_hash`). Supports `?active=true|false|all`, `?role=staff|admin`, pagination.

**`POST /api/admin/users`** — Creates user with bcrypt factor 12 password hashing. Checks username+email uniqueness (409 DUPLICATE_USERNAME / DUPLICATE_EMAIL). Returns user without `password_hash`.

**`PATCH /api/admin/users/[id]`** — Updates role, active, department. Guards `active=false` against self-deactivation (`403 SELF_DEACTIVATION`). Determines audit action: `USER_DEACTIVATED | USER_REACTIVATED | USER_UPDATED`.

**`POST /api/admin/users/[id]/reset-password`** — Atomically updates `password_hash` + increments `token_version: { increment: 1 }` in single transaction, invalidating all active JWT sessions for that user.

**`GET /api/admin/api-keys`** — Lists keys with `status: 'active'|'revoked'` computed field. Explicit select excludes `key_hash` entirely.

**`POST /api/admin/api-keys`** — Generates 64-char hex plaintext from `randomBytes(32)`, stores only `createHash('sha256').update(plaintext).digest('hex')`. Returns `plaintext_key` in 201 response ONCE — never stored, never returned again.

**`PATCH /api/admin/api-keys/[id]`** — Sets `revoked_at = new Date()` atomically with audit log. Returns `409 ALREADY_REVOKED` if already revoked. Revocation immediately causes Open311 API key verifier to return 401.

**`GET /api/admin/audit-log`** — Paginated log with `actor` username include. Supports filtering by `actor_id`, `resource_type` (enum), `action` (text contains), `start_date`/`end_date` datetime range.

### Task 2: Admin UI Pages + Components + E2E Tests

**`app/admin/layout.tsx`** — Admin-scoped nav with links to Users, API Keys, Audit Log. Reuses LogoutButton from staff layout.

**`app/admin/users/page.tsx`** — Paginated user table with per-row Edit / Deactivate/Reactivate / Reset PW actions. Frontend disables deactivate button for current user (server also enforces). Inline UserForm panel shows 409 duplicate errors.

**`app/admin/api-keys/page.tsx`** — Generate key form (collect label+scope first), then receive plaintext in `ApiKeyModal`. Revoke with confirmation dialog. Revoked rows grayed out, no revoke button shown.

**`app/admin/audit-log/page.tsx`** — Read-only table with filter panel (actor dropdown, resource type enum, action text, date range). No edit/delete UI.

**`components/admin/UserForm.tsx`** — Create/edit form with username/email/password/role/dept fields. Edit mode hides password field. Shows server-side 409 errors inline.

**`components/admin/ApiKeyModal.tsx`** — One-time plaintext key display with prominent warning "This key will NOT be shown again." Clipboard copy button with fallback. Dismiss button clears key from state.

**`e2e/admin-users-apikeys.spec.ts`** — 5 Playwright tests:
1. Create staff user → verify in table
2. Self-deactivation guard (frontend disabled or server 403)
3. Generate API key → verify modal + 64-char hex key + dismiss
4. Revoke API key → verify status changes to 'revoked'
5. View audit log → verify no password/hash data in table

## Security Properties Implemented

| Threat | Mitigation |
|--------|-----------|
| T-06-07: plaintext key exposure | Returned ONCE in 201 body; SHA-256 stored; GET list never exposes key_hash |
| T-06-08: role escalation | role enum-validated; requireSession('admin') required |
| T-06-09: password_hash exposure | Explicit Prisma select allowlist on all User queries |
| T-06-10: token_version bypass | Prisma atomic `{ increment: 1 }` in same tx as password update |
| T-06-11: self-deactivation | Server: 403 SELF_DEACTIVATION; UI: disabled button |
| T-06-12: revocation no audit | AdminAuditLog created in same $transaction as revoked_at update |
| T-06-13: sensitive metadata | Password reset audit metadata: only `{ note: '...' }` — no password/hash |

## Deviations from Plan

### Auto-added: GET /api/admin/me endpoint

- **Found during:** Task 2 (admin users page implementation)
- **Issue:** Admin users page needed current session user ID to disable deactivate-self button; no existing endpoint exposed this
- **Fix:** Added `app/api/admin/me/route.ts` returning `{ id, username, role }` from current admin session
- **Files modified:** `app/api/admin/me/route.ts` (new)
- **Commit:** ad845e57

### Implementation detail: Interactive vs sequential $transaction

- **Found during:** Task 1 (POST /api/admin/users, POST /api/admin/api-keys)
- **Issue:** Sequential `$transaction([...])` cannot reference the newly created record's ID for the audit log entry
- **Fix:** Used interactive `$transaction(async tx => { ... })` for these two routes; sequential used where ID is available upfront (reset-password, revoke key)
- **No additional files modified**

## Self-Check

### Created files exist:
- ✅ app/api/admin/users/route.ts
- ✅ app/api/admin/users/[id]/route.ts
- ✅ app/api/admin/users/[id]/reset-password/route.ts
- ✅ app/api/admin/api-keys/route.ts
- ✅ app/api/admin/api-keys/[id]/route.ts
- ✅ app/api/admin/audit-log/route.ts
- ✅ app/api/admin/me/route.ts
- ✅ app/admin/layout.tsx
- ✅ app/admin/page.tsx
- ✅ app/admin/users/page.tsx
- ✅ app/admin/api-keys/page.tsx
- ✅ app/admin/audit-log/page.tsx
- ✅ components/admin/UserForm.tsx
- ✅ components/admin/ApiKeyModal.tsx
- ✅ e2e/admin-users-apikeys.spec.ts

### Commits exist:
- ✅ e4a9f2cb: feat(06-02): admin user management + API key + audit-log route handlers
- ✅ ad845e57: feat(06-02): admin users, API keys, audit-log UI pages + E2E tests

### TypeScript: 0 errors (npx tsc --noEmit)

## Self-Check: PASSED
