
---

## F06: Admin Panel

**Description:** The back-office configuration interface accessible only to users with the `admin` role. All system reference data — categories, departments, substatuses, response templates, user accounts, and Open311 API keys — is managed through this panel. Changes take effect immediately without code deployment. The admin panel is located under `/admin/**` and is blocked to `staff` role by the middleware.

**Terminology:**
- **Reference data** — Configuration objects that govern system behavior: categories, departments, substatuses, response templates.
- **Deactivation** — Soft-disable of a record (sets `active = false`). Records are never hard-deleted to preserve foreign key integrity and audit trails.
- **API key scope** — Either `read` (GET endpoints only) or `write` (GET + POST endpoints) on the Open311 API.
- **Token version** — An integer on the `User` record incremented on password reset; JWTs carrying an older version are rejected.

**Sub-features:**
- Category management (CRUD + deactivate)
- CategoryGroup management
- Department management (CRUD + deactivate)
- Substatus management (CRUD + ordering)
- Response template management (CRUD + deactivate)
- User account management (create, deactivate, reset password)
- Open311 API key management (generate, label, revoke)

---

### F06a: Category Management

**Process:**
1. Admin navigates to `/admin/categories`.
2. List shows all categories (active + inactive), sorted by group, then name.
3. Admin creates/edits a category via a drawer form:
   - `name`, `description`, `icon` (lucide icon name), `color` (hex), `department_id`, `anon_allowed` (bool), `active` (bool), `service_code` (Open311 string, must be unique among active categories).
4. `POST /api/admin/categories` or `PATCH /api/admin/categories/[id]`.
5. To deactivate: `PATCH /api/admin/categories/[id]` with `{ active: false }`. If any open tickets reference this category, display a warning count but allow deactivation.

**Validation:**
- `name` required, ≤200 chars, unique among active categories.
- `service_code` required, ≤50 chars, alphanumeric + underscores, unique among ALL categories (active or inactive).
- `department_id` must reference an active department.
- `color` must match `#RRGGBB` pattern if provided.

---

### F06b: Department Management

**Process:**
1. Admin navigates to `/admin/departments`.
2. Admin creates/edits departments: `name`, `default_assignee_id` (optional), `active`.
3. `POST /api/admin/departments` or `PATCH /api/admin/departments/[id]`.
4. Deactivating a department with active categories: display warning, require confirmation.

**Validation:**
- `name` required, ≤200 chars, unique among active departments.
- `default_assignee_id` must reference an active staff/admin user if provided.

---

### F06c: Substatus Management

**Process:**
1. Admin navigates to `/admin/substatuses`.
2. Substatuses are grouped by parent `status` (`open`, `in_progress`, `closed`, `archived`).
3. Admin creates/edits substatus: `label` (public), `internal_label`, `status` (parent bucket), `sort_order`, `active`.
4. Drag-to-reorder updates `sort_order` fields in batch via `PATCH /api/admin/substatuses/reorder`.

**Validation:**
- `label` required, ≤100 chars, unique within same parent `status`.
- `status` must be one of the four valid status values.
- `sort_order` ≥ 0.

---

### F06d: Response Template Management

**Process:**
1. Admin navigates to `/admin/response-templates`.
2. Admin creates/edits templates: `name`, `body` (with `{{ticket_id}}`, `{{address}}`, `{{category_name}}` placeholders), `category_id` (optional, for filtering), `department_id` (optional), `active`.
3. Template body supports markdown-lite (bold, italic, line breaks) — rendered as plain text when inserted into a response.

**Validation:**
- `name` required, ≤200 chars, unique among active templates.
- `body` required, ≥1 char, ≤10000 chars.
- Placeholder tokens validated: only `{{ticket_id}}`, `{{address}}`, `{{category_name}}` are supported. Unknown `{{...}}` tokens flagged as warnings (not errors).

---

### F06e: User Account Management

**Process:**
1. Admin navigates to `/admin/users`.
2. Admin creates a new account: `username`, `email`, `password` (initial), `role` (`staff`|`admin`), `department_id` (optional).
3. `POST /api/admin/users` — server hashes password, creates `User` record with `active = true`.
4. Admin can deactivate: `PATCH /api/admin/users/[id]` with `{ active: false }`. Deactivated users cannot log in; existing sessions are not immediately invalidated (expire naturally or on next request when token version check fails after reset).
5. Admin-initiated password reset: `POST /api/admin/users/[id]/reset-password` with `{ new_password }`. Server updates hash and increments `token_version`, invalidating all active sessions.

**Validation:**
- `username` required, ≤50 chars, alphanumeric + underscore + hyphen, unique across all users.
- `email` required, valid email, unique.
- Initial `password` must meet policy (≥12 chars, ≥1 uppercase, ≥1 digit).
- `role` must be `staff` or `admin`.
- Admin cannot deactivate their own account.

---

### F06f: Open311 API Key Management

**Process:**
1. Admin navigates to `/admin/api-keys`.
2. Admin clicks "Generate Key." Server generates a 32-byte random hex string, stores `key_hash = sha256(key)`, returns the plaintext key **once** (shown in a dismissible modal; cannot be retrieved again).
3. Admin assigns a `label` (≤100 chars) and `scope` (`read` | `write`).
4. Key list shows: label, scope, created_at, last_used_at, status (active/revoked).
5. Admin revokes a key: `PATCH /api/admin/api-keys/[id]` with `{ revoked_at: now() }`. Revoked keys return `401` on use.

**Validation:**
- `label` required, ≤100 chars, unique among active keys.
- `scope` must be `read` or `write`.
- Generated key is 32 bytes (64 hex chars); stored only as SHA-256 hash.

**Inputs (summary across F06 sub-features):**

| Entity | Key Fields | Unique Constraints |
|--------|------------|-------------------|
| Category | name, service_code, department_id, anon_allowed | service_code global; name among active |
| Department | name, default_assignee_id | name among active |
| Substatus | label, internal_label, status, sort_order | label within parent status |
| ResponseTemplate | name, body, category_id, department_id | name among active |
| User | username, email, password, role, department_id | username global; email global |
| ApiKey | label, scope | label among active |

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Duplicate service_code | 409 | DUPLICATE_SERVICE_CODE | "service_code already in use" |
| Duplicate username | 409 | DUPLICATE_USERNAME | "Username already taken" |
| Duplicate email | 409 | DUPLICATE_EMAIL | "Email already registered" |
| Self-deactivation | 403 | SELF_DEACTIVATION | "Cannot deactivate your own account" |
| Invalid role value | 422 | INVALID_ROLE | "Role must be staff or admin" |
| Invalid API key scope | 422 | INVALID_SCOPE | "Scope must be read or write" |
| Key already revoked | 409 | ALREADY_REVOKED | "API key is already revoked" |

**API Surface (this feature):**
- `GET/POST /api/admin/categories` — list/create categories
- `PATCH/DELETE /api/admin/categories/[id]` — update/deactivate category
- `GET/POST /api/admin/departments` — list/create departments
- `PATCH /api/admin/departments/[id]` — update department
- `GET/POST /api/admin/substatuses` — list/create substatuses
- `PATCH /api/admin/substatuses/reorder` — batch reorder
- `PATCH /api/admin/substatuses/[id]` — update substatus
- `GET/POST /api/admin/response-templates` — list/create templates
- `PATCH /api/admin/response-templates/[id]` — update template
- `GET/POST /api/admin/users` — list/create users
- `PATCH /api/admin/users/[id]` — update user
- `POST /api/admin/users/[id]/reset-password` — admin reset
- `GET/POST /api/admin/api-keys` — list/generate keys
- `PATCH /api/admin/api-keys/[id]` — revoke key
→ see `Y1-api.md §Admin`

**Schema Surface (this feature):** uses `Category`, `CategoryGroup`, `Department`, `Substatus`, `ResponseTemplate`, `User`, `ApiKey` — see `Y0-schema.md`.

---
