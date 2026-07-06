
---

## F04: Staff Ticket Detail

**Description:** The full single-ticket workspace for staff members. This page aggregates all information about a ticket — its location on a Leaflet mini-map, complete audit history timeline, status/substatus controls, assignee picker, linked constituent, response composition with template support, and the full media gallery. Every change made on this page creates an immutable `TicketHistory` record. Staff notes can be marked as public-facing (visible on the constituent tracking page) or internal-only.

**Terminology:**
- **History timeline** — Chronological, append-only log of all changes to a ticket (status changes, assignments, responses, media additions). Rendered as a vertical timeline UI component.
- **Internal note** — A `Response` with `is_public = false`; visible only to staff/admin.
- **Public response** — A `Response` with `is_public = true`; visible to constituents on `/tickets/[id]`.
- **Response template** — A `ResponseTemplate` record with a pre-written body and optional variable placeholders (`{{ticket_id}}`, `{{address}}`, `{{category_name}}`).
- **Related tickets** — Tickets sharing the same address (within ~50m) or linked to the same `Person`.

**Sub-features:**
- Ticket header (ID, category, department, address, map pin)
- Status selector with confirmation dialog
- Substatus selector
- Assignee picker with staff user search
- History timeline (status changes, assignments, responses, media)
- Internal note composition
- Public response composition with preview
- Response template picker and insertion
- Media gallery (view, download, add)
- Linked constituent (Person) panel
- Related tickets panel

**Process — Viewing Ticket Detail:**
1. Staff navigates to `/staff/tickets/[id]`. Auth guards verified via middleware.
2. Server fetches the ticket with all relations: `Category`, `Department`, `Substatus`, `User` (assignee), `TicketHistory` (with actor User), `Response` (ordered `created_at ASC`), `Media`, `TicketPerson` → `Person`, related tickets.
3. Page renders all sections. History timeline entries are sorted oldest-first.
4. `TicketHistory` action types rendered with distinct icons: `STATUS_CHANGE`, `ASSIGNMENT`, `RESPONSE`, `MEDIA_ADDED`, `SUBSTATUS_CHANGE`.

**Process — Status / Substatus Change:**
1. Staff selects a new status from the status dropdown. A confirmation dialog lists old status → new status and prompts for an optional internal note.
2. Staff confirms. Client sends `PATCH /api/staff/tickets/[id]` with `{ status, substatus_id?, note? }`.
3. Server validates status transition (all transitions allowed except: closed → open requires admin role).
4. Server updates `Ticket.status`, `Ticket.substatus_id`, sets `Ticket.updated_at = now()`.
5. Server appends a `TicketHistory` row: `action = "STATUS_CHANGE"`, `from_value = oldStatus`, `to_value = newStatus`, `actor_id = currentUser.id`.
6. If `note` provided, also creates a `Response` with `is_public = false`.
7. Returns `200` with updated ticket.

**Process — Assignment:**
1. Staff clicks assignee field, types to search staff users (typeahead: `GET /api/staff/users?q=...`).
2. Staff selects a user. Client sends `PATCH /api/staff/tickets/[id]` with `{ assignee_id }`.
3. Server updates `Ticket.assignee_id`, appends `TicketHistory` row with `action = "ASSIGNMENT"`.

**Process — Add Response:**
1. Staff types in the response textarea or selects a template from the dropdown.
2. If template selected: client fetches template body, substitutes placeholders (`{{ticket_id}}` → ticket reference_id, `{{address}}` → ticket address, `{{category_name}}` → category name), inserts into textarea.
3. Staff chooses "Internal note" or "Public response" toggle.
4. Staff submits. Client sends `POST /api/staff/tickets/[id]/responses` with `{ body, is_public, template_id? }`.
5. Server creates `Response` record. Server appends `TicketHistory` row with `action = "RESPONSE"`.
6. If `is_public = true`, response will appear on the constituent tracking page.

**Process — Add Media:**
1. Staff uses the media upload control on the ticket detail page.
2. Client sends `POST /api/staff/tickets/[id]/media` (multipart) with file(s).
3. Server validates file (same rules as F00: ≤10MB, MIME allowlist, ≤5 files per upload).
4. Server creates `Media` record(s). Server appends `TicketHistory` row with `action = "MEDIA_ADDED"`.

**Inputs:**

*Ticket update (`PATCH /api/staff/tickets/[id]`):*

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `status` | `string` | No | `open\|in_progress\|closed\|archived` |
| `substatus_id` | `string\|null` | No | Valid substatus CUID or null to clear |
| `assignee_id` | `string\|null` | No | Valid user CUID or null to unassign |
| `note` | `string` | No | ≤4000 chars; stored as internal Response |

*Response creation (`POST /api/staff/tickets/[id]/responses`):*

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `body` | `string` | Yes | ≥1 char, ≤10000 chars |
| `is_public` | `boolean` | Yes | true = public, false = internal |
| `template_id` | `string` | No | ResponseTemplate CUID; for audit only |

**Outputs:**
- `PATCH` returns updated ticket object (same shape as detail fetch).
- `POST /responses` returns `{ response_id, body, is_public, created_at }`.
- `POST /media` returns array of `{ media_id, filename, mime_type, created_at }`.

**Validation:**
- `closed → open` status transition requires `admin` role; `staff` role attempt returns `403 TRANSITION_FORBIDDEN`.
- `substatus_id` must belong to a `Substatus` whose `status` value matches the new/current status.
- Response `body` must be non-empty after trimming.
- Template placeholder substitution is client-side only; server stores the rendered text.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Ticket not found | 404 | NOT_FOUND | "Ticket not found" |
| Invalid status transition (staff→open) | 403 | TRANSITION_FORBIDDEN | "Only admins can re-open closed tickets" |
| Substatus/status mismatch | 422 | SUBSTATUS_MISMATCH | "Substatus does not belong to selected status" |
| Response body empty | 422 | EMPTY_RESPONSE | "Response body cannot be empty" |
| Media file too large | 422 | MEDIA_TOO_LARGE | "File exceeds 10MB limit" |
| Assignee user not found | 422 | USER_NOT_FOUND | "Assignee user not found" |

**API Surface (this feature):**
- `GET /api/staff/tickets/[id]` — full ticket detail
- `PATCH /api/staff/tickets/[id]` — update status/substatus/assignee
- `POST /api/staff/tickets/[id]/responses` — add response
- `GET /api/staff/tickets/[id]/responses` — list responses
- `POST /api/staff/tickets/[id]/media` — upload media
- `GET /api/staff/users` — staff user typeahead
- `GET /api/staff/response-templates` — list templates
→ see `Y1-api.md §Staff Tickets`

**Schema Surface (this feature):** uses `Ticket`, `TicketHistory`, `Response`, `ResponseTemplate`, `Media`, `User`, `Category`, `Substatus`, `TicketPerson`, `Person` — see `Y0-schema.md`.

---
