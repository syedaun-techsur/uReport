
---

## F03: Staff Ticket Queue

**Description:** The primary staff workspace for reviewing and acting on the incoming stream of constituent reports. Provides a paginated, filterable, full-text-searchable list of tickets with configurable columns, saved filter sets (Bookmarks), bulk operations, and a toggle to visualize the filtered set on a Leaflet map. This is the first screen staff see after logging in.

**Terminology:**
- **Queue** — The filtered, sorted, paginated view of all tickets accessible to the current staff member.
- **Bookmark** — A named, persisted set of filter+sort parameters saved per staff user in the `BookmarkedFilter` table.
- **FTS query** — A Postgres full-text search query against the `Ticket.search_vector` tsvector column.
- **Bbox filter** — A geographic bounding-box filter: `minLat, minLng, maxLat, maxLng` constraining tickets by their `lat`/`lng` coordinates.
- **Bulk action** — An operation applied to multiple selected tickets in one server call.

**Sub-features:**
- Paginated ticket list with configurable visible columns
- Filter panel (category, department, status, substatus, assignee, date range, geo bbox)
- Full-text search across title/description/address
- Saved filter Bookmarks (create, load, update, delete)
- Bulk status update
- Bulk assignee update
- Sort by created_at, updated_at, priority
- Quick-view popover on row hover
- Map view toggle (visualize filtered queue on Leaflet)

**Process — Loading the Queue:**
1. Staff user navigates to `/staff/tickets`. Auth.js middleware verifies `staff` or `admin` role.
2. Client sends `GET /api/staff/tickets` with query params (see Inputs).
3. Server builds a Prisma query:
   - Applies all active filters (see Validation for filter rules).
   - If `q` (search) is provided: performs `WHERE search_vector @@ plainto_tsquery('english', ?)` using Prisma's `$queryRaw` or mapped FTS operator.
   - Applies `ORDER BY` (default: `created_at DESC`).
   - Applies `LIMIT page_size OFFSET (page-1)*page_size`.
4. Server returns paginated result with metadata.
5. Client renders the table. Columns visible per user's saved preference (stored in localStorage or `User.ui_prefs` JSON field).

**Process — Saving a Bookmark:**
1. Staff user configures filters and clicks "Save View."
2. Client sends `POST /api/staff/bookmarks` with `{ name, filter_json }`.
3. Server creates a `BookmarkedFilter` record linked to the current user.
4. Bookmark appears in the "Saved Views" sidebar dropdown.

**Process — Loading a Bookmark:**
1. Staff user selects a saved view from the dropdown.
2. Client fetches `GET /api/staff/bookmarks/[id]` → retrieves `filter_json`.
3. Client hydrates all filter fields from `filter_json` and re-issues the queue request.

**Process — Bulk Update:**
1. Staff user selects rows via checkboxes and chooses a bulk action (status change or assign).
2. Client sends `PATCH /api/staff/tickets/bulk` with `{ ticket_ids: string[], action: "status"|"assign", value: string }`.
3. Server validates each ticket ID exists and the user has permission (staff can update any assigned to their department; admin can update all).
4. Server applies the update within a Prisma transaction. Each change creates a `TicketHistory` entry with `actor_id = currentUser.id`.
5. Server returns `{ updated: number, failed: string[] }`.

**Inputs — Queue Request:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `q` | `string` | No | ≤500 chars; FTS query |
| `category_id` | `string` | No | Active category CUID |
| `department_id` | `string` | No | Department CUID |
| `status` | `string` | No | `open\|in_progress\|closed\|archived` |
| `substatus_id` | `string` | No | Substatus CUID |
| `assignee_id` | `string` | No | User CUID |
| `date_from` | `string` | No | ISO8601 date |
| `date_to` | `string` | No | ISO8601 date; ≥ date_from |
| `bbox` | `string` | No | `minLat,minLng,maxLat,maxLng` comma-separated |
| `sort` | `string` | No | `created_at\|updated_at\|priority`; default `created_at` |
| `order` | `string` | No | `asc\|desc`; default `desc` |
| `page` | `number` | No | ≥1; default 1 |
| `page_size` | `number` | No | 10–100; default 25 |

**Outputs:**

```json
{
  "data": [
    {
      "ticket_id": "string",
      "reference_id": "string",
      "category_name": "string",
      "department_name": "string",
      "status": "string",
      "substatus_label": "string | null",
      "assignee_name": "string | null",
      "address": "string",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ],
  "meta": {
    "total": "number",
    "page": "number",
    "page_size": "number",
    "total_pages": "number"
  }
}
```

**Validation:**
- All CUID filter params validated to exist in DB; unknown IDs return empty result set (not error).
- `date_from` must be ≤ `date_to` if both provided; otherwise `422 DATE_RANGE_INVALID`.
- `bbox` parsed as 4 floats; any non-numeric value returns `422 BBOX_INVALID`.
- `page_size` clamped server-side to max 100.
- Bulk update: `ticket_ids` array must be non-empty (≥1) and ≤100 IDs; `value` must match valid status or user ID.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Unauthenticated | 401 | UNAUTHORIZED | "Authentication required" |
| Invalid date range | 422 | DATE_RANGE_INVALID | "date_from must be before date_to" |
| Invalid bbox format | 422 | BBOX_INVALID | "bbox must be minLat,minLng,maxLat,maxLng" |
| Bulk IDs empty | 422 | BULK_EMPTY | "No tickets selected" |
| Bulk IDs exceed limit | 422 | BULK_TOO_LARGE | "Maximum 100 tickets per bulk operation" |
| Bookmark not found | 404 | NOT_FOUND | "Saved view not found" |
| Bookmark name conflict | 409 | CONFLICT | "A saved view with this name already exists" |

**API Surface (this feature):**
- `GET /api/staff/tickets` — filtered/paginated queue
- `PATCH /api/staff/tickets/bulk` — bulk status/assign
- `GET /api/staff/bookmarks` — list bookmarks
- `POST /api/staff/bookmarks` — create bookmark
- `GET /api/staff/bookmarks/[id]` — get bookmark
- `PATCH /api/staff/bookmarks/[id]` — update bookmark
- `DELETE /api/staff/bookmarks/[id]` — delete bookmark
→ see `Y1-api.md §Staff Tickets`

**Schema Surface (this feature):** uses `Ticket`, `Category`, `Department`, `Substatus`, `User`, `BookmarkedFilter`, `TicketHistory` — see `Y0-schema.md`.

---
