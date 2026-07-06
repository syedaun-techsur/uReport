# Functional Requirements Document
## uReport NG — City of Bloomington Municipal 311/CRM

**Project Acronym:** uReportNG  
**FRD Version:** 1.0  
**Date:** 2026-07-06  
**Status:** Active  
**Based on PRD:** PRD-uReportNG.md v1.0  

---

## Scope

This document specifies the detailed functional behavior of every feature in uReport NG. It provides sufficient precision for a developer to implement each feature without ambiguity: inputs, outputs, validation rules, error handling, API contracts, and database schemas are fully described. This FRD does not cover deployment runbooks or UI visual design — those are addressed in TechArch-uReportNG.md and design mockups respectively.

---

## How to Read This Document

- **Feature chunks** are numbered `F00`–`F09`, corresponding to PRD features F0–F9.
- **Cross-feature chunks** are prefixed `Y0`–`Y3` (schema, API, errors, integrations).
- Feature IDs in `FXXX` format reference features within this document; `PRD §FN` references the source PRD section.
- All API paths are relative to the application root (e.g., `/api/v2/services`).
- HTTP status codes follow RFC 9110.
- Zod validation schemas are expressed as TypeScript Zod object shapes.
- Database DDL is expressed as Prisma schema syntax.
- `[STAFF]` annotations indicate fields/behaviors visible only to authenticated staff or admin.
- `[ADMIN]` annotations indicate behaviors restricted to admin role only.

---

## Conventions

| Convention | Meaning |
|------------|---------|
| `required` | Field must be present and non-empty |
| `optional` | Field may be absent or null |
| `[AUTH: staff]` | Route/action requires staff or admin session |
| `[AUTH: admin]` | Route/action requires admin session only |
| `[AUTH: api-key]` | Route requires valid Open311 API key header/param |
| `[PUBLIC]` | No authentication required |
| `tsvector` | Postgres FTS indexed column, auto-updated via trigger |
| `bytea` | Postgres binary column used for media storage |

---

## Shared Terminology

- **Ticket** — A single constituent service request (synonymous with "service request" in Open311). Primary entity.
- **Person** — A constituent contact record linked to one or more tickets.
- **Category** — A service category (e.g., "Pothole", "Graffiti"). Maps to Open311 `service_code`.
- **CategoryGroup** — Optional grouping of categories for UI display.
- **Department** — A city department responsible for handling a category of tickets.
- **Status** — Top-level workflow state of a ticket: `open`, `in_progress`, `closed`, `archived`.
- **Substatus** — Admin-configurable refinement within a status (e.g., "Awaiting Parts" under `in_progress`).
- **TicketHistory** — Append-only audit log entry recording every change to a ticket.
- **Action** — A specific type of change recorded in TicketHistory (status change, assignment, comment, media upload).
- **Response** — A staff note on a ticket; either public-facing or internal-only.
- **ResponseTemplate** — A canned response body with optional variable placeholders.
- **Media** — A file attachment (image, document) stored as Postgres `bytea`.
- **Bookmark / BookmarkedFilter** — A saved ticket queue filter set, per staff user.
- **IssueType** — Synonym for Category in some Open311 contexts.
- **Client / ApiKey** — An Open311 API key record for third-party integrators.
- **Open311 GeoReport v2** — The open standard API for service request interoperability.
- **FTS** — Full-Text Search, implemented via Postgres `tsvector` + GIN indexes.
- **PostGIS** — Optional Postgres extension for geospatial queries. App degrades gracefully if absent.
- **Haversine** — App-level math fallback for distance calculations when PostGIS is unavailable.

---

## Table of Contents

| Chunk | Feature |
|-------|---------|
| [F00](#f00-public-constituent-portal) | F0: Public Constituent Portal |
| [F01](#f01-constituent-issue-tracking) | F1: Constituent Issue Tracking |
| [F02](#f02-authentication--role-based-sessions) | F2: Authentication & Role-Based Sessions |
| [F03](#f03-staff-ticket-queue) | F3: Staff Ticket Queue |
| [F04](#f04-staff-ticket-detail) | F4: Staff Ticket Detail |
| [F05](#f05-staff-crm--people-management) | F5: Staff CRM / People Management |
| [F06](#f06-admin-panel) | F6: Admin Panel |
| [F07](#f07-open311-georeport-v2-api) | F7: Open311 GeoReport v2 API |
| [F08](#f08-reports--metrics-dashboard) | F8: Reports & Metrics Dashboard |
| [F09](#f09-infrastructure--platform) | F9: Infrastructure & Platform |
| [Y0](#y0-database-schema) | Database Schema (Prisma DDL) |
| [Y1](#y1-api-endpoint-catalog) | API Endpoint Catalog |
| [Y2](#y2-error-catalog) | Cross-Feature Error Catalog |
| [Y3](#y3-integration-points) | External Integration Points |

---

---

## F00: Public Constituent Portal

**Description:** The primary entry point for city residents to report municipal issues. This feature provides a map-first, multi-step reporting flow where constituents drop a pin or type an address on a Leaflet/OpenStreetMap map, select a service category, write a description, optionally attach a photo, and optionally provide contact information. The form supports anonymous submissions on a per-category basis. On successful submission a confirmation screen displays the generated ticket ID. The entire portal is WCAG 2.1 AA compliant and responsive for mobile field use.

**Terminology:**
- **Anonymous submission** — A ticket submitted without any contact information. Allowed only when the selected category has `anon_allowed = true`.
- **Geo-pin** — A map marker placed by the user to indicate the issue location.
- **Reverse geocode** — Translating lat/lng coordinates to a human-readable address string (performed client-side via Nominatim or equivalent OSM service).
- **Submission token** — A short-lived (30-minute) CSRF token bound to the submission session.

**Sub-features:**
- Interactive map with pin placement (Leaflet + OpenStreetMap)
- Address text search with autocomplete (Nominatim/OSM)
- Category selection with department routing display
- Description text entry
- Optional media/photo upload
- Optional contact information (name, email, phone)
- Anonymous mode enforcement per category
- WCAG 2.1 AA keyboard navigation and ARIA labels throughout
- Confirmation screen with ticket ID and shareable URL

**Process:**
1. User navigates to `/` (public portal home).
2. System renders the Leaflet map centered on the city's configured default coordinates (`CITY_CENTER_LAT`, `CITY_CENTER_LNG` env vars) at zoom level 13.
3. User either: (a) clicks the map to drop a pin, or (b) types an address in the search box.
4. If address typed: system queries Nominatim with the input; displays a dropdown of up to 5 candidate addresses; user selects one; system places a pin at the selected lat/lng and populates the address field.
5. System validates that the pin is within the city's configured bounding box (`CITY_BBOX_MINLAT`, `CITY_BBOX_MINLNG`, `CITY_BBOX_MAXLAT`, `CITY_BBOX_MAXLNG`). If outside bounds, display warning but do not block submission.
6. User selects a category from the dropdown (populated from active categories only). System displays the routing department name below the selector.
7. User enters a description (free text, required, ≥10 characters, ≤4000 characters).
8. User optionally attaches a photo via file input (max 10MB, MIME: `image/*` or `application/pdf`; multiple files up to 5).
9. If category has `anon_allowed = false`, contact information fields (name, email, phone) are shown as required. If `anon_allowed = true`, contact fields are optional and labeled "Optional — leave blank to submit anonymously."
10. User submits the form. Client validates all required fields before POST.
11. Server receives `POST /api/tickets` with multipart form data. Server validates all fields (see Validation). Server creates a `Ticket` record plus `Media` records (if files attached) plus a `Person` record and `TicketPerson` join (if contact info provided) within a single Prisma transaction.
12. Server returns `201 Created` with `{ ticket_id, reference_id, status, category_name, created_at }`.
13. Client navigates to confirmation screen `/tickets/[id]/confirm` showing the ticket ID, a link to `/tickets/[id]` for tracking, and a message to save the ID.

**Inputs:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `lat` | `number` | Yes | Valid latitude −90 to 90 |
| `lng` | `number` | Yes | Valid longitude −180 to 180 |
| `address` | `string` | Yes | ≥5 chars, ≤500 chars |
| `category_id` | `string (cuid)` | Yes | Must match an active category |
| `description` | `string` | Yes | ≥10 chars, ≤4000 chars |
| `name` | `string` | Conditional | Required if `anon_allowed=false`; ≤200 chars |
| `email` | `string (email)` | Conditional | Required if `anon_allowed=false`; valid email |
| `phone` | `string` | Optional | E.164 or local format; ≤30 chars |
| `files[]` | `File[]` | Optional | ≤5 files; each ≤10MB; MIME `image/*` or `application/pdf` |

**Outputs:**
- `201 Created` JSON: `{ ticket_id: string, reference_id: string, status: "open", category_name: string, created_at: ISO8601 }`
- Confirmation page rendered at `/tickets/[id]/confirm`
- Email notification to constituent if email provided (future — out of scope v1, framework hook present)

**Validation (Zod):**
```typescript
z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(5).max(500),
  category_id: z.string().cuid(),
  description: z.string().min(10).max(4000),
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
})
```
- If category `anon_allowed = false` and both `name` and `email` are absent → validation error `CONTACT_REQUIRED`.
- File size checked server-side; MIME type validated against allowlist.
- `category_id` verified to exist and be active via DB lookup inside the route handler (after schema parse).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Missing required field | 422 | VALIDATION_ERROR | Field-level Zod errors array |
| category_id not found / inactive | 422 | INVALID_CATEGORY | "Selected category is not available" |
| Contact required but absent | 422 | CONTACT_REQUIRED | "Contact information is required for this category" |
| File too large | 422 | MEDIA_TOO_LARGE | "File exceeds 10MB limit" |
| Unsupported MIME type | 422 | MEDIA_TYPE_INVALID | "File type not accepted" |
| Too many files | 422 | MEDIA_TOO_MANY | "Maximum 5 files per submission" |
| DB write failure | 500 | SUBMISSION_FAILED | "Submission failed — please try again" |
| Nominatim unavailable | 503 | GEOCODE_UNAVAILABLE | "Address search temporarily unavailable" (non-blocking — user can still pin manually) |

**API Surface (this feature):**
- `POST /api/tickets` — create ticket (public, no auth required) → see `Y1-api.md §Tickets`
- `GET /api/categories` — list active categories for dropdown → see `Y1-api.md §Categories`
- `GET /api/media/[id]` — serve uploaded media → see `Y1-api.md §Media`

**Schema Surface (this feature):** uses `Ticket`, `Person`, `TicketPerson`, `Category`, `Media` — see `Y0-schema.md`.

---

---

## F01: Constituent Issue Tracking

**Description:** Allows any visitor (no login required) to look up the status of a previously submitted ticket by its ID and view a public map of all currently open issues across the city. The ticket lookup displays only public-safe fields — internal staff notes are not exposed. The public map uses Leaflet marker clustering to handle high ticket density efficiently.

**Terminology:**
- **Public fields** — Ticket fields safe to display to unauthenticated users: ID, category, status, substatus (public label), creation date, last-updated date, address, and any response notes flagged `is_public = true`.
- **Marker clustering** — Leaflet.markercluster grouping nearby pins at low zoom levels; individual pins reveal on zoom or cluster click.
- **Deep link** — A stable, shareable URL of the form `/tickets/[id]` that resolves to a single ticket's public status page.

**Sub-features:**
- Ticket lookup by ID (URL param or search form)
- Public status page with all public-safe fields
- Public map showing all `status IN (open, in_progress)` tickets with clustering
- Cluster expansion on zoom / click
- Individual ticket popup with summary + deep-link button
- No authentication required for any sub-feature

**Process — Ticket Lookup:**
1. User navigates to `/tickets/[id]` (deep link) or enters an ID in the lookup form on `/`.
2. Server fetches the ticket by ID. If not found, return `404` and render "Ticket not found" page.
3. Server filters the response to public-safe fields only (see Outputs).
4. Page renders: ticket ID (displayed as reference), category name, status (human-readable), substatus public label (if set), submission date, last-updated date, address, and any `Response` records where `is_public = true`.
5. A Leaflet mini-map renders the ticket pin location.
6. A "Copy link" button is present for sharing the URL.

**Process — Public Map:**
1. User navigates to `/map` or activates the map tab on the home page.
2. Client requests `GET /api/tickets/public-map` which returns all tickets with `status IN ('open','in_progress')` as a GeoJSON FeatureCollection (lat, lng, ticket_id, category_name, status).
3. Leaflet renders markers from the GeoJSON. Leaflet.markercluster clusters markers at zoom < 14.
4. Clicking a cluster zooms in and expands. Clicking an individual marker opens a popup: category icon, category name, status badge, address snippet, "View details →" link to `/tickets/[id]`.
5. Map refreshes stale data if tab becomes active after >5 minutes.

**Inputs:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` (URL param) | `string (cuid)` | Yes (for lookup) | Must match existing ticket |
| Map bounding box (implicit) | Derived from Leaflet viewport | — | Server returns all public tickets; client-side clustering |

**Outputs:**

*Ticket lookup (`GET /api/tickets/[id]/public`):*
```json
{
  "ticket_id": "string",
  "reference_id": "string",
  "category_name": "string",
  "status": "open | in_progress | closed | archived",
  "substatus_label": "string | null",
  "address": "string",
  "lat": "number",
  "lng": "number",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "public_responses": [
    { "body": "string", "created_at": "ISO8601" }
  ]
}
```

*Public map (`GET /api/tickets/public-map`):*
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [lng, lat] },
      "properties": {
        "ticket_id": "string",
        "category_name": "string",
        "status": "string",
        "address_snippet": "string"
      }
    }
  ]
}
```

**Validation:**
- `id` must be a valid CUID string format; otherwise return `400 INVALID_ID`.
- Ticket must exist in DB; otherwise return `404 NOT_FOUND`.
- `public-map` endpoint caps response at 5000 features to avoid oversized payloads; oldest tickets dropped first if over limit.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid ticket ID format | 400 | INVALID_ID | "Invalid ticket ID format" |
| Ticket not found | 404 | NOT_FOUND | "Ticket not found" |
| DB unavailable | 503 | DB_UNAVAILABLE | "Service temporarily unavailable" |

**API Surface (this feature):**
- `GET /api/tickets/[id]/public` — public ticket detail → see `Y1-api.md §Tickets`
- `GET /api/tickets/public-map` — GeoJSON for public map → see `Y1-api.md §Tickets`

**Schema Surface (this feature):** reads `Ticket`, `Category`, `Substatus`, `Response` (is_public filter) — see `Y0-schema.md`.

---

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

---

## F05: Staff CRM / People Management

**Description:** A lightweight constituent relationship management module enabling staff to view, search, link, and manage contact records associated with ticket submissions. When a constituent provides contact information on submission, a `Person` record is automatically created and linked to their ticket. Staff can manually link or unlink persons, flag duplicates, execute merge operations with a full audit trail, and anonymize records on GDPR-style request. All CRM data is accessible only to authenticated staff and admin users.

**Terminology:**
- **Person** — A constituent contact record: name, email, phone, notes, preferred contact method.
- **TicketPerson** — Join table between `Ticket` and `Person` with a `role` field (`submitter` or `contact`).
- **Duplicate flag** — A staff marker on a `Person` record noting it may be a duplicate of another record.
- **Merge** — The operation of combining two `Person` records into one: all `TicketPerson` rows from the source are re-pointed to the target; the source is then soft-deleted with an audit note.
- **Anonymization** — Nulling out all PII fields on a `Person` record (`name`, `email`, `phone`, `notes`) and setting `anonymized_at`; linked tickets are unaffected but display "Anonymous Constituent."

**Sub-features:**
- Person search (name, email, phone) using Postgres FTS
- Person detail view (contact info, linked tickets, notes)
- Manual link/unlink of Person ↔ Ticket
- Duplicate flag workflow
- Person merge with audit trail
- GDPR anonymization of Person record
- Auto-create Person on ticket submission (see F00)

**Process — Person Search:**
1. Staff navigates to `/staff/people` or uses the search panel on a ticket detail page.
2. Staff types a search query (name, email, or phone fragment).
3. Client sends `GET /api/staff/people?q=<query>`.
4. Server performs: `WHERE person_search_vector @@ plainto_tsquery('english', ?)` (tsvector over name, email, phone fields).
5. Returns paginated list of matching `Person` records (no PII in list snippet for non-admin unless directly needed).

**Process — Link / Unlink Person to Ticket:**
1. From ticket detail (F04) "Linked Constituent" panel, staff clicks "Link Person."
2. A search modal opens; staff searches and selects a `Person`.
3. Client sends `POST /api/staff/tickets/[id]/persons` with `{ person_id, role: "contact" }`.
4. Server creates `TicketPerson` row. Appends `TicketHistory` entry with `action = "PERSON_LINKED"`.
5. To unlink: `DELETE /api/staff/tickets/[id]/persons/[person_id]`. Appends `TicketHistory` with `action = "PERSON_UNLINKED"`. (Cannot unlink the original `submitter` unless admin.)

**Process — Merge Persons:**
1. Staff views a `Person` record flagged as duplicate. Clicks "Merge with…" and selects the target (canonical) person.
2. Client sends `POST /api/staff/people/merge` with `{ source_id, target_id }`.
3. Server, in a transaction:
   a. Re-points all `TicketPerson` rows from `source_id` to `target_id` (avoid duplicate join rows via upsert).
   b. Copies non-null fields from source to target if target field is null (name, email, phone, notes).
   c. Sets `Person.merged_into_id = target_id` and `Person.deleted_at = now()` on source.
   d. Appends a `TicketHistory` note on each affected ticket: "Person records merged by [actor]."
4. Returns `{ target_person_id, tickets_relinked: number }`.

**Process — Anonymize Person:**
1. Staff (or admin) navigates to `Person` detail, clicks "Anonymize Record."
2. Confirmation dialog warns: "All personal information will be permanently removed."
3. Client sends `PATCH /api/staff/people/[id]/anonymize`.
4. Server nulls `name`, `email`, `phone`, `notes`, sets `anonymized_at = now()`.
5. Linked tickets remain; their display substitutes "Anonymous Constituent."
6. Audit log entry created: `action = "PERSON_ANONYMIZED"`, `actor_id`, timestamp.

**Inputs:**

*Person search:*

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `q` | `string` | Yes | ≥2 chars, ≤200 chars |
| `page` | `number` | No | ≥1; default 1 |
| `page_size` | `number` | No | 10–50; default 20 |

*Link person to ticket:*

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `person_id` | `string (cuid)` | Yes | Must exist and not be anonymized |
| `role` | `string` | Yes | `submitter\|contact` |

*Merge persons:*

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `source_id` | `string (cuid)` | Yes | Must exist, not anonymized |
| `target_id` | `string (cuid)` | Yes | Must exist, not anonymized, ≠ source_id |

**Outputs:**
- Person search: `{ data: Person[], meta: PaginationMeta }`
- Person detail: full `Person` object with `linked_tickets: TicketSummary[]`
- Merge: `{ target_person_id, tickets_relinked: number }`
- Anonymize: `204 No Content`

**Validation:**
- Search query minimum 2 characters to prevent full-table FTS scan.
- Merge: `source_id ≠ target_id`; both must be non-anonymized, non-deleted.
- Unlink: staff cannot unlink the original `submitter` role unless admin.
- Anonymize: once `anonymized_at` is set, the record cannot be un-anonymized.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Person not found | 404 | NOT_FOUND | "Person not found" |
| Merge same person | 422 | MERGE_SAME | "Source and target must be different people" |
| Merge anonymized source | 422 | PERSON_ANONYMIZED | "Cannot merge an anonymized record" |
| Unlink submitter by staff | 403 | FORBIDDEN | "Only admins can unlink the original submitter" |
| Already anonymized | 409 | ALREADY_ANONYMIZED | "This record has already been anonymized" |

**API Surface (this feature):**
- `GET /api/staff/people` — person search
- `GET /api/staff/people/[id]` — person detail
- `PATCH /api/staff/people/[id]` — update person record
- `POST /api/staff/people/merge` — merge two persons
- `PATCH /api/staff/people/[id]/anonymize` — anonymize person
- `POST /api/staff/tickets/[id]/persons` — link person to ticket
- `DELETE /api/staff/tickets/[id]/persons/[person_id]` — unlink person
→ see `Y1-api.md §CRM`

**Schema Surface (this feature):** uses `Person`, `TicketPerson`, `Ticket`, `TicketHistory` — see `Y0-schema.md`.

---

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

---

## F07: Open311 GeoReport v2 API

**Description:** A fully backward-compatible implementation of the Open311 GeoReport v2 specification, exposed at `/api/v2/`. This surface is the integration contract for third-party clients (mobile apps, 311 aggregators) and must not regress. All field names match the GeoReport v2 specification exactly. Both JSON (default) and XML response formats are supported via `format=xml` query param or `Accept: application/xml` header. POST endpoints require a valid API key. GET endpoints are public with optional rate limiting.

**Terminology:**
- **service_request_id** — Open311 name for what this system calls `ticket_id` (CUID).
- **service_code** — Open311 name for `Category.service_code`.
- **requested_datetime** — Open311 name for `Ticket.created_at` (ISO8601 UTC).
- **updated_datetime** — Open311 name for `Ticket.updated_at`.
- **status_notes** — The most recent public `Response.body` on the ticket, or null.
- **Content negotiation** — JSON returned by default; XML returned when `format=xml` param or `Accept: application/xml` header is present.

**Sub-features:**
- `GET /api/v2/services` — list all active service categories
- `GET /api/v2/services/{service_code}` — single service definition with attribute schema
- `POST /api/v2/requests` — submit a new service request (API-key required)
- `GET /api/v2/requests` — query service requests (filterable, paginated)
- `GET /api/v2/requests/{service_request_id}` — single request detail
- JSON + XML response format support
- Rate limiting on GET endpoints
- API key authentication on POST

---

### F07.1: GET /api/v2/services

**Process:**
1. Request received (public, no auth).
2. Fetch all `Category` records where `active = true`, ordered by `name ASC`.
3. Map each to Open311 `service` object (see field mapping below).
4. Return JSON array or XML `<services>` document.

**Open311 Field Mapping — Service:**

| Open311 Field | Source Field | Notes |
|---------------|-------------|-------|
| `service_code` | `Category.service_code` | |
| `service_name` | `Category.name` | |
| `description` | `Category.description` | |
| `metadata` | `false` | v1 has no extended attributes |
| `type` | `"realtime"` | All categories are realtime |
| `keywords` | `""` | Reserved for future use |
| `group` | `CategoryGroup.name` or `""` | |

---

### F07.2: GET /api/v2/services/{service_code}

**Process:**
1. Look up `Category` by `service_code`. If not found or `active = false` → `404`.
2. Return service object + `attributes: []` (no extended attributes in v1).

---

### F07.3: POST /api/v2/requests

**Process:**
1. Extract API key from `api_key` query param or `X-Api-Key` header.
2. Hash the supplied key with SHA-256; look up `ApiKey` by `key_hash`.
3. If not found, hash mismatch, or `revoked_at IS NOT NULL` → `401 UNAUTHORIZED`.
4. Check `ApiKey.scope = "write"`; if `scope = "read"` → `403 FORBIDDEN`.
5. Update `ApiKey.last_used_at = now()`.
6. Parse and validate request body (see Inputs).
7. Look up `Category` by `service_code`. If not found → `404 SERVICE_CODE_NOT_FOUND`.
8. If `anon_allowed = false` and no contact info provided → `422 CONTACT_REQUIRED`.
9. Create `Ticket` + optional `Person` + optional `Media` (same transaction as F00).
10. Return `201` with array containing one `service_request` object.

**Open311 Field Mapping — POST Request Input:**

| Open311 Field | Destination | Required | Notes |
|---------------|-------------|----------|-------|
| `service_code` | `Category.service_code` lookup | Yes | |
| `lat` | `Ticket.lat` | Yes | |
| `long` | `Ticket.lng` | Yes | Note: Open311 uses `long` not `lng` |
| `address_string` | `Ticket.address` | Cond. | Required if lat/long absent |
| `description` | `Ticket.description` | Yes | |
| `first_name` | `Person.name` (first) | No | Combined with last_name |
| `last_name` | `Person.name` (last) | No | |
| `email` | `Person.email` | No | |
| `phone` | `Person.phone` | No | |
| `api_key` | Auth | Yes | |
| `media_url` | Ignored in v1 | No | Future media-by-URL feature |

**Open311 Field Mapping — Response (service_request object):**

| Open311 Field | Source Field | Notes |
|---------------|-------------|-------|
| `service_request_id` | `Ticket.id` | |
| `status` | `Ticket.status` mapped | `open` → `open`, `in_progress` → `open`, `closed` → `closed`, `archived` → `closed` |
| `status_notes` | Latest public `Response.body` | null if none |
| `service_name` | `Category.name` | |
| `service_code` | `Category.service_code` | |
| `description` | `Ticket.description` | |
| `agency_responsible` | `Department.name` | |
| `service_notice` | `null` | |
| `requested_datetime` | `Ticket.created_at` | ISO8601 UTC |
| `updated_datetime` | `Ticket.updated_at` | ISO8601 UTC |
| `expected_datetime` | `null` | Not implemented v1 |
| `address` | `Ticket.address` | |
| `address_id` | `null` | |
| `zipcode` | `null` | |
| `lat` | `Ticket.lat` | |
| `long` | `Ticket.lng` | Note: Open311 uses `long` |
| `media_url` | `null` | Not exposed externally v1 |

---

### F07.4: GET /api/v2/requests

**Process:**
1. Apply rate limit: `OPEN311_RATE_LIMIT` req/min per IP (default 60; env-configurable).
2. Parse and validate query params (see Inputs).
3. Build Prisma query with all active filters.
4. Return paginated array of `service_request` objects.

**Query Parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `service_request_id` | string | Exact ID lookup |
| `service_code` | string | Filter by category |
| `status` | `open\|closed` | Maps to internal multi-status |
| `start_date` | ISO8601 | `requested_datetime >=` |
| `end_date` | ISO8601 | `requested_datetime <=` |
| `page` | number | ≥1; default 1 |
| `page_size` | number | 1–100; default 20; max 100 |
| `format` | `json\|xml` | Response format |

*Open311 `status` mapping:*
- `open` → `Ticket.status IN ('open', 'in_progress')`
- `closed` → `Ticket.status IN ('closed', 'archived')`

---

### F07.5: GET /api/v2/requests/{service_request_id}

**Process:**
1. Look up `Ticket` by `id`. If not found → `404`.
2. Return array with one `service_request` object (Open311 spec returns an array even for single-item lookup).

---

### Content Negotiation

- Default: `Content-Type: application/json`
- XML trigger: `?format=xml` OR `Accept: application/xml`
- XML root element for services: `<services>`, child: `<service>`
- XML root element for requests: `<service_requests>`, child: `<request>`
- XML is generated via a lightweight serializer (no external XML library required); element names match Open311 spec exactly.

**Inputs — POST /api/v2/requests (Zod):**
```typescript
z.object({
  service_code: z.string().min(1).max(50),
  lat: z.coerce.number().min(-90).max(90).optional(),
  long: z.coerce.number().min(-180).max(180).optional(),
  address_string: z.string().max(500).optional(),
  description: z.string().min(10).max(4000),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  api_key: z.string().optional(), // also accepted as header
}).refine(d => d.lat !== undefined || d.address_string, {
  message: "lat/long or address_string required",
});
```

**Error States:**

| Scenario | HTTP Status | Error Code | Open311 Error Message |
|----------|-------------|------------|-----------------------|
| Missing/invalid API key | 401 | `key_not_found` | "API key was not found" |
| Read-only key on POST | 403 | `key_read_only` | "API key does not have write permission" |
| service_code not found | 404 | `service_not_found` | "Service not found" |
| No location provided | 422 | `location_required` | "lat/long or address_string required" |
| Contact required | 422 | `contact_required` | "Contact information required for this service" |
| Validation error | 422 | `validation_error` | Field-level detail |
| Rate limit exceeded | 429 | `rate_limit` | "Too many requests" |
| Server error | 500 | `server_error` | "Internal server error" |

*Note: Open311 error responses use `{ errors: [{ code, description }] }` format for JSON and `<errors><error>` for XML.*

**API Surface (this feature):**
- `GET /api/v2/services` — list services
- `GET /api/v2/services/[service_code]` — service detail
- `POST /api/v2/requests` — submit request
- `GET /api/v2/requests` — query requests
- `GET /api/v2/requests/[service_request_id]` — single request
→ see `Y1-api.md §Open311`

**Schema Surface (this feature):** uses `Ticket`, `Category`, `CategoryGroup`, `Department`, `Person`, `TicketPerson`, `Response`, `ApiKey` — see `Y0-schema.md`.

---

---

## F08: Reports & Metrics Dashboard

**Description:** An analytics dashboard available to staff and admin users providing configurable views of service request trends, workload distribution, and resolution performance. All charts are rendered client-side using a lightweight charting library (Recharts recommended). The geographic density view uses Leaflet. Results can be exported to CSV. All data is computed from live Postgres aggregation queries — no separate analytics store.

**Terminology:**
- **Date range** — A user-selected time window; preset options (Last 7d, Last 30d, Last 90d) plus a custom date picker.
- **Resolution time** — Duration between `Ticket.created_at` and the first `TicketHistory` entry with `action = "STATUS_CHANGE"` where `to_value = "closed"`.
- **Heat/cluster view** — A Leaflet map displaying ticket density; uses circle markers sized by cluster count, or a heatmap layer via Leaflet.heat plugin.
- **CSV export** — A download of the current filtered dataset as RFC 4180-compliant CSV.

**Sub-features:**
- Volume by category (bar/line chart, time series)
- Volume by department (bar/line chart, time series)
- Open vs. closed breakdown (donut chart with status drill-down)
- Average resolution time (mean and median per category and department)
- Geographic density map (Leaflet cluster or heat view)
- Date range picker (presets + custom)
- CSV export of current filtered result

**Process — Dashboard Load:**
1. Staff/admin navigates to `/staff/reports`. Auth.js middleware verifies `staff` or `admin` role.
2. Default date range: Last 30 days. Client sends requests to all chart endpoints in parallel.
3. Each chart component independently fetches its data endpoint and renders on receipt.
4. User changes date range → all chart components re-fetch with new `start_date` / `end_date`.

**Process — Volume by Category:**
1. Client sends `GET /api/staff/reports/volume-by-category?start_date=&end_date=&interval=day|week|month`.
2. Server executes: `SELECT category_id, COUNT(*) as count, date_trunc(interval, created_at) as period FROM tickets WHERE created_at BETWEEN ? AND ? GROUP BY category_id, period ORDER BY period`.
3. Returns time-series data grouped by category.
4. Client renders as grouped bar chart or multi-line chart; categories shown as colored series.

**Process — Open vs. Closed Breakdown:**
1. Client sends `GET /api/staff/reports/status-breakdown?start_date=&end_date=`.
2. Server returns `{ open: N, in_progress: N, closed: N, archived: N }` counts for tickets created in range.
3. Client renders as donut chart. Clicking a segment navigates to queue filtered by that status.

**Process — Average Resolution Time:**
1. Client sends `GET /api/staff/reports/resolution-time?start_date=&end_date=&group_by=category|department`.
2. Server computes, for all tickets closed in the date range: resolution time = `closed_at - created_at` where `closed_at` = first `TicketHistory.created_at` where `to_value = 'closed'`.
3. Returns `{ group_id, group_name, mean_hours, median_hours, count }[]`.
4. Client renders as horizontal bar chart.

**Process — Geographic Density View:**
1. Client sends `GET /api/staff/reports/geo-density?start_date=&end_date=&status=open|closed|all`.
2. Server returns GeoJSON FeatureCollection of ticket points (same structure as F01 public map but filtered by date range and status).
3. Leaflet renders with clustering or heat layer.

**Process — CSV Export:**
1. User clicks "Export CSV" on any chart or on the reports summary table.
2. Client sends `GET /api/staff/reports/export?start_date=&end_date=&format=csv` (or the specific endpoint for the active view).
3. Server streams a CSV response with `Content-Disposition: attachment; filename="ureport-export-{date}.csv"`.
4. CSV columns: `ticket_id, reference_id, category, department, status, substatus, address, lat, lng, created_at, updated_at, closed_at, resolution_hours, assignee`.

**Inputs:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `start_date` | `string (ISO8601 date)` | No | Default: 30 days ago |
| `end_date` | `string (ISO8601 date)` | No | Default: today; ≥ start_date |
| `interval` | `string` | No | `day\|week\|month`; default `day` |
| `group_by` | `string` | No | `category\|department`; default `category` |
| `status` | `string` | No | `open\|closed\|all`; default `all` |
| `format` | `string` | No | `json\|csv`; default `json` |

**Outputs:**

*Volume by category (sample):*
```json
[
  { "period": "2026-07-01", "category_id": "...", "category_name": "Pothole", "count": 14 },
  { "period": "2026-07-02", "category_id": "...", "category_name": "Pothole", "count": 9 }
]
```

*Status breakdown:*
```json
{ "open": 42, "in_progress": 17, "closed": 391, "archived": 5 }
```

*Resolution time:*
```json
[
  { "group_name": "Streets", "mean_hours": 48.2, "median_hours": 36.0, "count": 87 }
]
```

**Validation:**
- `start_date` must be ≤ `end_date`; otherwise `422 DATE_RANGE_INVALID`.
- Date range maximum span: 366 days (to prevent runaway aggregation queries); `422 DATE_RANGE_TOO_WIDE`.
- `interval` must be one of `day`, `week`, `month`.
- CSV export row limit: 10,000 rows; if exceeded, return first 10,000 with a `X-Export-Truncated: true` header.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Unauthenticated | 401 | UNAUTHORIZED | "Authentication required" |
| Date range invalid | 422 | DATE_RANGE_INVALID | "start_date must be before end_date" |
| Date range too wide | 422 | DATE_RANGE_TOO_WIDE | "Date range cannot exceed 366 days" |
| Invalid interval | 422 | INVALID_INTERVAL | "interval must be day, week, or month" |

**API Surface (this feature):**
- `GET /api/staff/reports/volume-by-category` — time-series by category
- `GET /api/staff/reports/volume-by-department` — time-series by department
- `GET /api/staff/reports/status-breakdown` — open/closed counts
- `GET /api/staff/reports/resolution-time` — mean/median resolution
- `GET /api/staff/reports/geo-density` — GeoJSON for heatmap
- `GET /api/staff/reports/export` — CSV export
→ see `Y1-api.md §Reports`

**Schema Surface (this feature):** reads `Ticket`, `TicketHistory`, `Category`, `Department` — see `Y0-schema.md`.

---

---

## F09: Infrastructure & Platform

**Description:** The deployment, operations, and developer-experience foundation for uReport NG. This feature covers the Kubernetes-native single-pod deployment model, database bootstrapping, health check endpoints, 12-factor configuration, media storage architecture, structured logging, and PostGIS graceful degradation. These are not UI features — they are platform contracts that every other feature depends on.

**Terminology:**
- **Sidecar** — A Postgres 16 container injected alongside the app container in the same K8s pod, connected via `DATABASE_URL`.
- **Readiness probe** — A K8s HTTP check against `/api/health/ready` that returns `200` only when the DB is connected and all migrations are applied.
- **Liveness probe** — A K8s HTTP check against `/api/health/live` that returns `200` as long as the Node.js process is running.
- **`infrastructure.json`** — Pivota platform configuration file declaring `sidecar_requirements: ["postgres"]`.
- **12-factor** — All runtime configuration is sourced from environment variables; no secrets in the container image.
- **tsvector trigger** — A Postgres trigger function that automatically updates `Ticket.search_vector` when description, address, or title changes.

**Sub-features:**
- Single Next.js process on port 3000
- `infrastructure.json` sidecar declaration
- `prisma migrate deploy` at pod startup
- Seed data script (admin user, categories, departments)
- `GET /api/health/live` — liveness probe
- `GET /api/health/ready` — readiness probe with DB check
- Media storage as Postgres bytea
- `GET /api/media/[id]` — media serving with MIME headers
- Structured JSON request logging
- PostGIS auto-detection with Haversine fallback
- CSP/framing: no `X-Frame-Options: DENY/SAMEORIGIN` or `frame-ancestors 'none'`

---

### F09.1: Kubernetes Deployment

**Requirements:**
- `infrastructure.json` in repo root:
  ```json
  {
    "sidecar_requirements": ["postgres"],
    "port": 3000
  }
  ```
- `next.config.ts` (`.ts` extension, not `.js`) with `PIVOTA_DB_MODE=sidecar-postgres` support.
- `Dockerfile` (or equivalent): `ENTRYPOINT` runs `node scripts/migrate-and-start.js` which:
  1. Runs `prisma migrate deploy` (waits up to 60s for DB; retries with exponential backoff).
  2. On success, runs optional seed if `SEED_ON_BOOT=true` env var is set.
  3. Starts the Next.js server.
- Pod does not accept traffic until readiness probe passes.

---

### F09.2: Health Endpoints

**GET /api/health/live:**
- Returns `200 { status: "ok", timestamp: ISO8601 }` immediately if the process is running.
- No DB check. Always fast.

**GET /api/health/ready:**
- Executes `SELECT 1` against the Prisma DB connection.
- Checks that `prisma migrate status` reports no pending migrations (or simply verifies schema version table has latest migration applied).
- Returns `200 { status: "ready", db: "connected", migrations: "applied" }` if all checks pass.
- Returns `503 { status: "not_ready", error: "<reason>" }` if DB is unreachable or migrations pending.

---

### F09.3: Media Storage & Serving

**Storage:**
- Files ≤ 8KB stored as `bytea` directly in `Media.data`.
- Files > 8KB stored via Postgres Large Object API (`pg_largeobject`); `Media.lo_oid` stores the OID; `Media.data` is null.
- Actual threshold configurable via `MEDIA_LO_THRESHOLD_KB` env var (default 8).
- Max upload size: `MEDIA_MAX_SIZE_MB` env var (default 10MB).

**Serving (`GET /api/media/[id]`):**
1. Fetch `Media` record by ID. If not found → `404`.
2. Check ticket visibility: if media belongs to a non-public ticket, require `staff` or `admin` session.
3. Stream `data` bytes or read from Large Object.
4. Set headers: `Content-Type: {mime_type}`, `Content-Disposition: inline; filename="{filename}"`, `Cache-Control: private, max-age=3600`.
5. No local filesystem involvement.

---

### F09.4: Structured Logging

**Requirements:**
- All Next.js API route handlers log at minimum: `{ timestamp, method, path, status, duration_ms, user_id?, ticket_id? }` as JSON to stdout.
- Errors log full stack trace as `{ level: "error", message, stack, ... }`.
- `LOG_LEVEL` env var controls verbosity (`debug`|`info`|`warn`|`error`; default `info`).
- No PII in log fields (name, email, phone must not be logged).

---

### F09.5: PostGIS Auto-Detection

**Startup sequence:**
1. At app startup, execute: `SELECT PostGIS_Version()`.
2. If result returned: set `global.GEO_MODE = 'postgis'`.
3. If query throws: set `global.GEO_MODE = 'haversine'`. Log: `[INFO] PostGIS unavailable — using Haversine fallback`.
4. All geo distance/proximity queries in the codebase check `GEO_MODE`:
   - `postgis`: use `ST_DWithin(geography, geography, meters)` and `ST_Distance`.
   - `haversine`: use JavaScript Haversine formula applied to lat/lng values from DB result.

**Affected queries:**
- Staff queue bbox filter (F03)
- Related tickets proximity (F04)
- Geographic density map (F08)
- Open311 `GET /requests` bbox (F07)

---

### F09.6: Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | — | Prisma connection string (required) |
| `AUTH_SECRET` | — | Auth.js JWT signing secret (required) |
| `NEXTAUTH_URL` | — | Auth.js canonical URL (required in prod) |
| `AUTH_SESSION_TTL` | `28800` | Session TTL in seconds (8 hours) |
| `CITY_CENTER_LAT` | `39.165325` | Map default center latitude |
| `CITY_CENTER_LNG` | `-86.526384` | Map default center longitude |
| `CITY_BBOX_MINLAT` | — | City bounding box (optional) |
| `CITY_BBOX_MINLNG` | — | City bounding box (optional) |
| `CITY_BBOX_MAXLAT` | — | City bounding box (optional) |
| `CITY_BBOX_MAXLNG` | — | City bounding box (optional) |
| `OPEN311_RATE_LIMIT` | `60` | Max Open311 GET requests per minute per IP |
| `MEDIA_MAX_SIZE_MB` | `10` | Max upload size in MB |
| `MEDIA_LO_THRESHOLD_KB` | `8` | Bytea/LargeObject threshold in KB |
| `SEED_ON_BOOT` | `false` | Run seed script on startup |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `PIVOTA_DB_MODE` | — | `sidecar-postgres` when on Pivota platform |
| `TZ` | `America/Indiana/Indianapolis` | Server timezone for date display |

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Media not found | 404 | NOT_FOUND | "Media not found" |
| Media access unauthorized | 403 | FORBIDDEN | "Access denied" |
| Readiness: DB unreachable | 503 | DB_UNAVAILABLE | "Database connection failed" |
| Readiness: migrations pending | 503 | MIGRATIONS_PENDING | "Database migrations not applied" |
| Startup: DATABASE_URL missing | — | — | Process exits with error log |

**API Surface (this feature):**
- `GET /api/health/live` — liveness probe
- `GET /api/health/ready` — readiness probe
- `GET /api/media/[id]` — serve media file
→ see `Y1-api.md §Infrastructure`

**Schema Surface (this feature):** uses `Media` table — see `Y0-schema.md`.

---

---

## Y0: Database Schema (Prisma DDL)

All entities use `String @id @default(cuid())` as primary key unless noted. Timestamps use `DateTime @default(now())` / `@updatedAt`. Soft-delete is via `active Boolean @default(true)` or `deleted_at DateTime?`. Full-text search uses a raw SQL `tsvector` column managed by a Postgres trigger (not directly in Prisma schema; added via migration SQL).

---

### Y0.1: Ticket

```prisma
model Ticket {
  id           String    @id @default(cuid())
  reference_id String    @unique @default(cuid()) // Human-readable reference, shorter CUID
  service_code String    // denormalized from Category for Open311 queries
  description  String
  address      String
  lat          Float?
  lng          Float?
  status       TicketStatus  @default(open)
  // search_vector is a tsvector column added via raw migration SQL (GIN index)
  // search_vector Unsupported("tsvector")? // managed by trigger

  category_id  String
  category     Category      @relation(fields: [category_id], references: [id])

  department_id String?
  department    Department?   @relation(fields: [department_id], references: [id])

  substatus_id  String?
  substatus     Substatus?    @relation(fields: [substatus_id], references: [id])

  assignee_id   String?
  assignee      User?         @relation("TicketAssignee", fields: [assignee_id], references: [id])

  history       TicketHistory[]
  responses     Response[]
  media         Media[]
  persons       TicketPerson[]

  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  @@index([status])
  @@index([category_id])
  @@index([department_id])
  @@index([assignee_id])
  @@index([created_at])
  @@index([lat, lng])
}

enum TicketStatus {
  open
  in_progress
  closed
  archived
}
```

*Raw migration SQL (added alongside Prisma migration):*
```sql
ALTER TABLE "Ticket" ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION ticket_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.address, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_search_vector_trigger
BEFORE INSERT OR UPDATE ON "Ticket"
FOR EACH ROW EXECUTE FUNCTION ticket_search_vector_update();

CREATE INDEX ticket_search_vector_gin ON "Ticket" USING GIN (search_vector);
```

---

### Y0.2: Person

```prisma
model Person {
  id                  String    @id @default(cuid())
  name                String?
  email               String?
  phone               String?
  notes               String?
  preferred_contact   String?   // "email" | "phone" | "none"
  anonymized_at       DateTime?
  merged_into_id      String?
  deleted_at          DateTime?

  tickets             TicketPerson[]

  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt

  @@index([email])
  // person_search_vector tsvector (added via raw SQL, same pattern as Ticket)
}
```

*Person FTS migration:*
```sql
ALTER TABLE "Person" ADD COLUMN person_search_vector tsvector;

CREATE OR REPLACE FUNCTION person_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.person_search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.phone, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER person_search_vector_trigger
BEFORE INSERT OR UPDATE ON "Person"
FOR EACH ROW EXECUTE FUNCTION person_search_vector_update();

CREATE INDEX person_search_vector_gin ON "Person" USING GIN (person_search_vector);
```

---

### Y0.3: TicketPerson

```prisma
model TicketPerson {
  id         String  @id @default(cuid())
  ticket_id  String
  ticket     Ticket  @relation(fields: [ticket_id], references: [id])
  person_id  String
  person     Person  @relation(fields: [person_id], references: [id])
  role       String  // "submitter" | "contact"
  created_at DateTime @default(now())

  @@unique([ticket_id, person_id])
  @@index([person_id])
  @@index([ticket_id])
}
```

---

### Y0.4: Category & CategoryGroup

```prisma
model CategoryGroup {
  id         String     @id @default(cuid())
  name       String     @unique
  sort_order Int        @default(0)
  categories Category[]
}

model Category {
  id           String         @id @default(cuid())
  service_code String         @unique
  name         String
  description  String?
  icon         String?        // lucide icon name
  color        String?        // hex #RRGGBB
  anon_allowed Boolean        @default(true)
  active       Boolean        @default(true)

  group_id     String?
  group        CategoryGroup? @relation(fields: [group_id], references: [id])

  department_id String?
  department    Department?   @relation(fields: [department_id], references: [id])

  tickets       Ticket[]
  templates     ResponseTemplate[]

  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@index([active])
  @@index([service_code])
}
```

---

### Y0.5: Department

```prisma
model Department {
  id                  String    @id @default(cuid())
  name                String    @unique
  active              Boolean   @default(true)
  default_assignee_id String?
  default_assignee    User?     @relation("DeptDefaultAssignee", fields: [default_assignee_id], references: [id])

  categories          Category[]
  tickets             Ticket[]
  templates           ResponseTemplate[]

  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
}
```

---

### Y0.6: Substatus

```prisma
model Substatus {
  id             String       @id @default(cuid())
  label          String       // public-facing
  internal_label String?
  status         TicketStatus // parent status bucket
  sort_order     Int          @default(0)
  active         Boolean      @default(true)

  tickets        Ticket[]

  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  @@unique([label, status])
  @@index([status, sort_order])
}
```

---

### Y0.7: TicketHistory

```prisma
model TicketHistory {
  id          String  @id @default(cuid())
  ticket_id   String
  ticket      Ticket  @relation(fields: [ticket_id], references: [id])
  actor_id    String?
  actor       User?   @relation(fields: [actor_id], references: [id])
  action      String  // STATUS_CHANGE | ASSIGNMENT | RESPONSE | MEDIA_ADDED | SUBSTATUS_CHANGE | PERSON_LINKED | PERSON_UNLINKED | PERSON_ANONYMIZED
  from_value  String?
  to_value    String?
  note        String?
  created_at  DateTime @default(now())

  @@index([ticket_id, created_at])
  @@index([actor_id])
}
```

---

### Y0.8: Response

```prisma
model Response {
  id           String   @id @default(cuid())
  ticket_id    String
  ticket       Ticket   @relation(fields: [ticket_id], references: [id])
  author_id    String?
  author       User?    @relation(fields: [author_id], references: [id])
  body         String
  is_public    Boolean  @default(false)
  template_id  String?  // ResponseTemplate reference (for audit; not enforced FK)
  created_at   DateTime @default(now())

  @@index([ticket_id, is_public])
}
```

---

### Y0.9: ResponseTemplate

```prisma
model ResponseTemplate {
  id           String    @id @default(cuid())
  name         String
  body         String
  active       Boolean   @default(true)
  category_id  String?
  category     Category? @relation(fields: [category_id], references: [id])
  department_id String?
  department    Department? @relation(fields: [department_id], references: [id])

  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt

  @@unique([name])
}
```

---

### Y0.10: Media

```prisma
model Media {
  id         String   @id @default(cuid())
  ticket_id  String
  ticket     Ticket   @relation(fields: [ticket_id], references: [id])
  mime_type  String
  filename   String
  data       Bytes?   // bytea for small files (≤ MEDIA_LO_THRESHOLD_KB)
  lo_oid     Int?     // Postgres Large Object OID for large files
  size_bytes Int
  created_at DateTime @default(now())

  @@index([ticket_id])
}
```

---

### Y0.11: User

```prisma
model User {
  id             String    @id @default(cuid())
  username       String    @unique
  email          String    @unique
  password_hash  String
  role           UserRole  @default(staff)
  active         Boolean   @default(true)
  token_version  Int       @default(0) // incremented on password reset
  department_id  String?
  department     Department? @relation("DeptDefaultAssignee", fields: [department_id], references: [id])

  assigned_tickets  Ticket[]         @relation("TicketAssignee")
  history_entries   TicketHistory[]
  responses         Response[]
  bookmarks         BookmarkedFilter[]

  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
}

enum UserRole {
  staff
  admin
}
```

---

### Y0.12: ApiKey

```prisma
model ApiKey {
  id           String    @id @default(cuid())
  label        String    @unique
  key_hash     String    @unique  // SHA-256 of the plaintext key
  scope        ApiScope  @default(read)
  last_used_at DateTime?
  revoked_at   DateTime?
  created_at   DateTime  @default(now())

  @@index([key_hash])
}

enum ApiScope {
  read
  write
}
```

---

### Y0.13: BookmarkedFilter

```prisma
model BookmarkedFilter {
  id          String   @id @default(cuid())
  user_id     String
  user        User     @relation(fields: [user_id], references: [id])
  name        String
  filter_json Json     // serialized filter state
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@unique([user_id, name])
  @@index([user_id])
}
```

---

### Y0.14: Indexes Summary

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| Ticket | `search_vector` | GIN | FTS queries |
| Ticket | `(status)` | BTree | Queue filtering |
| Ticket | `(category_id)` | BTree | Category filter |
| Ticket | `(department_id)` | BTree | Dept filter |
| Ticket | `(created_at)` | BTree | Sort, date range |
| Ticket | `(lat, lng)` | BTree | Bbox filter |
| Person | `person_search_vector` | GIN | FTS on contacts |
| Person | `(email)` | BTree | Email lookup |
| TicketHistory | `(ticket_id, created_at)` | BTree | Timeline queries |
| Substatus | `(status, sort_order)` | BTree | UI ordering |
| ApiKey | `(key_hash)` | BTree | Auth lookup |
| BookmarkedFilter | `(user_id)` | BTree | User's saved views |

---

---

## Y1: API Endpoint Catalog

All endpoints use Next.js 15 App Router Route Handlers (`app/api/.../route.ts`). JSON is the default response format unless noted. All staff/admin endpoints require Auth.js session (`[AUTH: staff]` or `[AUTH: admin]`). Public endpoints are marked `[PUBLIC]`. Open311 endpoints are covered separately in §Open311.

---

### §Public Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/tickets` | [PUBLIC] | Submit new ticket |
| GET | `/api/tickets/[id]/public` | [PUBLIC] | Public ticket status |
| GET | `/api/tickets/public-map` | [PUBLIC] | GeoJSON for public map |

---

#### POST /api/tickets

**Request:** `multipart/form-data`
```
lat: number
lng: number
address: string
category_id: string
description: string
name?: string
email?: string
phone?: string
files[]: File[] (max 5, each max MEDIA_MAX_SIZE_MB)
```

**Response 201:**
```json
{
  "ticket_id": "string",
  "reference_id": "string",
  "status": "open",
  "category_name": "string",
  "created_at": "ISO8601"
}
```

**Errors:** 422 VALIDATION_ERROR | 422 INVALID_CATEGORY | 422 CONTACT_REQUIRED | 422 MEDIA_TOO_LARGE | 500 SUBMISSION_FAILED

---

#### GET /api/tickets/[id]/public

**Response 200:**
```json
{
  "ticket_id": "string",
  "reference_id": "string",
  "category_name": "string",
  "status": "string",
  "substatus_label": "string | null",
  "address": "string",
  "lat": "number | null",
  "lng": "number | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "public_responses": [{ "body": "string", "created_at": "ISO8601" }]
}
```

---

#### GET /api/tickets/public-map

**Response 200:** GeoJSON FeatureCollection (max 5000 features, `status IN (open, in_progress)`)

---

### §Categories (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/categories` | [PUBLIC] | List active categories |

**Response 200:**
```json
[
  {
    "id": "string",
    "service_code": "string",
    "name": "string",
    "description": "string | null",
    "icon": "string | null",
    "color": "string | null",
    "anon_allowed": "boolean",
    "department_name": "string | null"
  }
]
```

---

### §Media

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/media/[id]` | [PUBLIC for public tickets; AUTH: staff for internal] | Serve media file |

**Response 200:** Binary stream with `Content-Type`, `Content-Disposition`, `Cache-Control` headers.

---

### §Staff Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/tickets` | [AUTH: staff] | Paginated/filtered ticket queue |
| GET | `/api/staff/tickets/[id]` | [AUTH: staff] | Full ticket detail |
| PATCH | `/api/staff/tickets/[id]` | [AUTH: staff] | Update status/substatus/assignee |
| PATCH | `/api/staff/tickets/bulk` | [AUTH: staff] | Bulk status/assign update |
| GET | `/api/staff/tickets/[id]/responses` | [AUTH: staff] | List all responses |
| POST | `/api/staff/tickets/[id]/responses` | [AUTH: staff] | Add response/note |
| POST | `/api/staff/tickets/[id]/media` | [AUTH: staff] | Upload media to ticket |
| POST | `/api/staff/tickets/[id]/persons` | [AUTH: staff] | Link person to ticket |
| DELETE | `/api/staff/tickets/[id]/persons/[person_id]` | [AUTH: staff] | Unlink person |

---

#### GET /api/staff/tickets — Query Params

```
q?: string (FTS)
category_id?: string
department_id?: string
status?: open|in_progress|closed|archived
substatus_id?: string
assignee_id?: string
date_from?: ISO8601
date_to?: ISO8601
bbox?: "minLat,minLng,maxLat,maxLng"
sort?: created_at|updated_at  (default: created_at)
order?: asc|desc  (default: desc)
page?: number  (default: 1)
page_size?: number  (default: 25, max: 100)
```

**Response 200:**
```json
{
  "data": [ { "ticket_id": "...", "reference_id": "...", "category_name": "...", "department_name": "...", "status": "...", "substatus_label": "...", "assignee_name": "...", "address": "...", "created_at": "...", "updated_at": "..." } ],
  "meta": { "total": 0, "page": 1, "page_size": 25, "total_pages": 0 }
}
```

---

#### PATCH /api/staff/tickets/[id]

**Request body (JSON):**
```json
{
  "status": "open|in_progress|closed|archived (optional)",
  "substatus_id": "string|null (optional)",
  "assignee_id": "string|null (optional)",
  "note": "string (optional, stored as internal response)"
}
```
**Response 200:** Updated ticket detail object.

---

#### PATCH /api/staff/tickets/bulk

**Request body (JSON):**
```json
{
  "ticket_ids": ["string"],
  "action": "status|assign",
  "value": "string"
}
```
**Response 200:** `{ "updated": number, "failed": ["string"] }`

---

#### POST /api/staff/tickets/[id]/responses

**Request body (JSON):**
```json
{
  "body": "string",
  "is_public": "boolean",
  "template_id": "string (optional)"
}
```
**Response 201:** `{ "response_id": "string", "body": "string", "is_public": boolean, "created_at": "ISO8601" }`

---

### §Staff Bookmarks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/bookmarks` | [AUTH: staff] | List user's bookmarks |
| POST | `/api/staff/bookmarks` | [AUTH: staff] | Create bookmark |
| GET | `/api/staff/bookmarks/[id]` | [AUTH: staff] | Get single bookmark |
| PATCH | `/api/staff/bookmarks/[id]` | [AUTH: staff] | Update bookmark |
| DELETE | `/api/staff/bookmarks/[id]` | [AUTH: staff] | Delete bookmark |

**POST/PATCH body:** `{ "name": "string", "filter_json": { ...filterState } }`

---

### §Staff Users & Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/users` | [AUTH: staff] | Staff user typeahead (q param) |
| GET | `/api/staff/response-templates` | [AUTH: staff] | List active response templates |
| POST | `/api/staff/account/password` | [AUTH: staff] | Self-service password change |

---

### §CRM (People)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/people` | [AUTH: staff] | Person search |
| GET | `/api/staff/people/[id]` | [AUTH: staff] | Person detail + linked tickets |
| PATCH | `/api/staff/people/[id]` | [AUTH: staff] | Update person record |
| POST | `/api/staff/people/merge` | [AUTH: staff] | Merge two person records |
| PATCH | `/api/staff/people/[id]/anonymize` | [AUTH: staff] | Anonymize person |

---

### §Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/reports/volume-by-category` | [AUTH: staff] | Time-series by category |
| GET | `/api/staff/reports/volume-by-department` | [AUTH: staff] | Time-series by department |
| GET | `/api/staff/reports/status-breakdown` | [AUTH: staff] | Open/closed counts |
| GET | `/api/staff/reports/resolution-time` | [AUTH: staff] | Mean/median resolution time |
| GET | `/api/staff/reports/geo-density` | [AUTH: staff] | GeoJSON for density map |
| GET | `/api/staff/reports/export` | [AUTH: staff] | CSV export |

All report endpoints accept: `start_date?, end_date?, interval?, group_by?, status?, format?`

---

### §Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/admin/categories` | [AUTH: admin] | List / create categories |
| PATCH | `/api/admin/categories/[id]` | [AUTH: admin] | Update / deactivate category |
| GET/POST | `/api/admin/departments` | [AUTH: admin] | List / create departments |
| PATCH | `/api/admin/departments/[id]` | [AUTH: admin] | Update department |
| GET/POST | `/api/admin/substatuses` | [AUTH: admin] | List / create substatuses |
| PATCH | `/api/admin/substatuses/[id]` | [AUTH: admin] | Update substatus |
| PATCH | `/api/admin/substatuses/reorder` | [AUTH: admin] | Batch reorder substatuses |
| GET/POST | `/api/admin/response-templates` | [AUTH: admin] | List / create templates |
| PATCH | `/api/admin/response-templates/[id]` | [AUTH: admin] | Update template |
| GET/POST | `/api/admin/users` | [AUTH: admin] | List / create users |
| PATCH | `/api/admin/users/[id]` | [AUTH: admin] | Update user (deactivate, role) |
| POST | `/api/admin/users/[id]/reset-password` | [AUTH: admin] | Reset user password |
| GET/POST | `/api/admin/api-keys` | [AUTH: admin] | List / generate API keys |
| PATCH | `/api/admin/api-keys/[id]` | [AUTH: admin] | Revoke API key |

---

### §Open311

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v2/services` | [PUBLIC] | List active service categories |
| GET | `/api/v2/services/[service_code]` | [PUBLIC] | Service definition |
| POST | `/api/v2/requests` | [AUTH: api-key write] | Submit service request |
| GET | `/api/v2/requests` | [PUBLIC + rate limit] | Query service requests |
| GET | `/api/v2/requests/[service_request_id]` | [PUBLIC + rate limit] | Single request detail |

**Content negotiation:** All Open311 endpoints respond with JSON by default. Pass `?format=xml` or `Accept: application/xml` for XML.

---

### §Infrastructure

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health/live` | [PUBLIC] | Liveness probe |
| GET | `/api/health/ready` | [PUBLIC] | Readiness probe |
| GET | `/api/media/[id]` | [PUBLIC/STAFF] | Serve media |

---

### §Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/[...nextauth]` | [PUBLIC] | Auth.js login/logout/session |
| POST | `/api/staff/account/password` | [AUTH: staff] | Change own password |

---

### Common Response Envelope (Error)

All non-Open311 error responses use:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field_errors": { "field_name": "error message" }
  }
}
```

`field_errors` is present only for 422 validation errors.

---

---

## Y2: Cross-Feature Error Catalog

This catalog lists all error codes used across features, normalized by HTTP status code. All error responses (except Open311 endpoints) use the common envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "field_errors": { "field": "message" }
  }
}
```

Open311 error format: `{ "errors": [{ "code": "error_code", "description": "message" }] }`

---

### 400 Bad Request

| Code | Feature | Trigger |
|------|---------|---------|
| `INVALID_ID` | F01, F04 | Ticket or resource ID is not a valid CUID format |
| `BBOX_INVALID` | F03, F07 | bbox param cannot be parsed as 4 floats |
| `INVALID_INTERVAL` | F08 | interval param is not day/week/month |
| `INVALID_FORMAT` | F07 | format param is not json or xml |

---

### 401 Unauthorized

| Code | Feature | Trigger |
|------|---------|---------|
| `UNAUTHORIZED` | F02–F09 | No valid Auth.js session on protected route |
| `AUTH_FAILED` | F02 | Invalid credentials on login |
| `key_not_found` | F07 | API key missing or hash not found (Open311 format) |

---

### 403 Forbidden

| Code | Feature | Trigger |
|------|---------|---------|
| `FORBIDDEN` | F02, F05 | Staff role accessing admin route; staff trying to unlink submitter |
| `TRANSITION_FORBIDDEN` | F04 | Staff attempting to re-open a closed ticket (admin-only) |
| `SELF_DEACTIVATION` | F06 | Admin trying to deactivate their own account |
| `key_read_only` | F07 | Write operation with read-scoped API key (Open311 format) |

---

### 404 Not Found

| Code | Feature | Trigger |
|------|---------|---------|
| `NOT_FOUND` | All | Requested resource ID does not exist |
| `service_not_found` | F07 | Open311 service_code not found or inactive |

---

### 409 Conflict

| Code | Feature | Trigger |
|------|---------|---------|
| `DUPLICATE_SERVICE_CODE` | F06 | Category service_code already exists |
| `DUPLICATE_USERNAME` | F06 | Username already taken |
| `DUPLICATE_EMAIL` | F06 | Email already registered |
| `CONFLICT` | F03 | Bookmark name already exists for user |
| `ALREADY_REVOKED` | F06 | API key already has a revoked_at timestamp |
| `ALREADY_ANONYMIZED` | F05 | Person record already anonymized |

---

### 422 Unprocessable Entity

| Code | Feature | Trigger |
|------|---------|---------|
| `VALIDATION_ERROR` | F00, F02, F06 | Zod schema validation failed; `field_errors` populated |
| `INVALID_CATEGORY` | F00, F07 | category_id exists but is inactive |
| `CONTACT_REQUIRED` | F00, F07 | Category has `anon_allowed=false` and no contact info provided |
| `MEDIA_TOO_LARGE` | F00, F04 | File exceeds `MEDIA_MAX_SIZE_MB` limit |
| `MEDIA_TYPE_INVALID` | F00, F04 | MIME type not in allowed list |
| `MEDIA_TOO_MANY` | F00, F04 | More than 5 files in a single upload |
| `DATE_RANGE_INVALID` | F03, F08 | start_date > end_date |
| `DATE_RANGE_TOO_WIDE` | F08 | Date range exceeds 366 days |
| `BULK_EMPTY` | F03 | Bulk operation called with empty ticket_ids array |
| `BULK_TOO_LARGE` | F03 | Bulk operation called with >100 ticket_ids |
| `SUBSTATUS_MISMATCH` | F04 | substatus_id belongs to a different parent status |
| `EMPTY_RESPONSE` | F04 | Response body is empty after trimming |
| `USER_NOT_FOUND` | F04 | assignee_id does not match an active user |
| `WRONG_PASSWORD` | F02 | Current password incorrect during change |
| `PASSWORD_POLICY` | F02, F06 | New password does not meet complexity requirements |
| `PASSWORD_MISMATCH` | F02 | confirm_password ≠ new_password |
| `MERGE_SAME` | F05 | source_id == target_id in merge operation |
| `PERSON_ANONYMIZED` | F05 | Attempting to merge/link an anonymized person |
| `INVALID_ROLE` | F06 | role field is not staff or admin |
| `INVALID_SCOPE` | F06 | scope field is not read or write |
| `location_required` | F07 | Open311 POST missing lat/long and address_string |
| `validation_error` | F07 | Open311 field validation failure |

---

### 429 Too Many Requests

| Code | Feature | Trigger |
|------|---------|---------|
| `rate_limit` | F07 | Open311 GET endpoint rate limit exceeded (`OPEN311_RATE_LIMIT` req/min) |

**Rate limit response headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
Retry-After: 30
```

---

### 500 Internal Server Error

| Code | Feature | Trigger |
|------|---------|---------|
| `SUBMISSION_FAILED` | F00 | Unhandled DB error during ticket creation |
| `server_error` | F07 | Open311 unhandled server error |
| `INTERNAL_ERROR` | All | Generic unhandled error (logged with stack trace) |

---

### 503 Service Unavailable

| Code | Feature | Trigger |
|------|---------|---------|
| `DB_UNAVAILABLE` | F01, F09 | Database connection failed |
| `MIGRATIONS_PENDING` | F09 | Readiness probe: pending migrations detected |
| `GEOCODE_UNAVAILABLE` | F00 | Nominatim address search service unreachable (non-blocking — map pin still works) |

---

### Security Error Handling Principles

1. **No enumeration:** Login errors always return the same message regardless of whether username exists or password is wrong.
2. **No stack traces to clients:** 500 errors return only a generic message; full stack trace is written to structured logs only.
3. **No PII in error messages:** Field names may appear in `field_errors` keys but values must not echo user-submitted PII.
4. **Consistent timing:** Auth operations use bcrypt which is inherently slow; no timing oracle possible.

---

---

## Y3: External Integration Points

This document catalogs all external systems and services that uReport NG interfaces with, including their contracts, failure modes, and graceful degradation behavior.

---

### Y3.1: OpenStreetMap / Nominatim (Geocoding)

**Purpose:** Address autocomplete and reverse geocoding on the public portal (F00) and map views.

**Integration type:** Client-side HTTP fetch from the browser (not server-side proxy in v1).

**Endpoint used:**
- Search: `https://nominatim.openstreetmap.org/search?q=<query>&format=json&countrycodes=us&limit=5`
- Reverse: `https://nominatim.openstreetmap.org/reverse?lat=<lat>&lon=<lng>&format=json`

**Contract:**
- Response: JSON array of `{ display_name, lat, lon, ... }` objects.
- Rate limit: Nominatim OSM has a 1 req/sec usage policy. The client debounces the search input (300ms delay before firing request).

**Failure mode:** If Nominatim is unreachable (network error or 5xx), the address search input shows "Address search unavailable" and the user falls back to map pin placement. Ticket submission continues normally without a geocoded address string — user may type the address manually.

**Error surfaced:** `GEOCODE_UNAVAILABLE` (non-blocking warning, not submission blocker).

**No API key required.** Usage attribution required per OSM tile usage policy (rendered Leaflet attribution layer fulfills this).

---

### Y3.2: OpenStreetMap Tile Server (Map Tiles)

**Purpose:** Raster map tiles for all Leaflet maps (public portal, public map, staff queue map view, ticket detail mini-map, reports heat map).

**Integration type:** Client-side Leaflet tile layer.

**Tile URL template:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

**Contract:** Tiles are fetched by the browser directly from OSM CDN. No server-side involvement.

**Failure mode:** If OSM tiles are unavailable, the map renders with a grey background (Leaflet fallback). All other application functionality is unaffected — the map is non-critical for ticket submission (coordinate pin is still tracked internally).

**No API key required.** OSM attribution must be visible on all map renders (Leaflet attribution layer).

---

### Y3.3: Postgres 16 Sidecar

**Purpose:** Primary data store — all application data, FTS indexes, and media storage.

**Integration type:** Server-side via Prisma ORM + `pg` driver.

**Connection:** `DATABASE_URL` environment variable (standard Postgres connection string).

**Contract:**
- Prisma schema defines the full data model.
- Migrations applied at startup via `prisma migrate deploy` (idempotent).
- FTS tsvector columns and GIN indexes added via raw SQL in migrations.
- Media stored as `bytea` (small) or Postgres Large Object (large files).

**PostGIS (optional extension):**
- App detects at startup via `SELECT PostGIS_Version()`.
- If present: uses `ST_DWithin`, `ST_Distance`, `ST_Within` for geo queries.
- If absent: falls back to Haversine formula computed in JavaScript.
- No startup failure if PostGIS is missing.

**Failure mode:** If DB is unreachable, the readiness probe (`/api/health/ready`) returns `503` and K8s blocks traffic. Application does not start serving requests until DB is available.

---

### Y3.4: Auth.js (NextAuth v5)

**Purpose:** Session management and credential authentication.

**Integration type:** Server-side library; no external service call.

**Contract:**
- Credentials provider calls `authorizeUser(username, password)` — local DB lookup only.
- JWT tokens signed with `AUTH_SECRET` env var.
- Session stored in httpOnly, Secure, SameSite=Lax cookie.
- No external identity provider, OAuth, or SAML in v1.

**Failure mode:** If `AUTH_SECRET` is not set, Auth.js throws at startup — application fails to start (intentional, security requirement).

---

### Y3.5: Open311 GeoReport v2 External Clients

**Purpose:** Third-party integrators (mobile apps, 311 aggregators) that consume the Open311 API surface.

**Integration type:** Inbound HTTP clients calling `/api/v2/**`.

**Contract:**
- Field names match GeoReport v2 spec exactly (see F07 field mapping tables).
- Both JSON and XML response formats supported.
- API keys issued via admin panel (F06f); keys hashed with SHA-256 at rest.
- Rate limiting applied to GET endpoints.

**Backward compatibility requirement:** All existing integrations must continue to work without change. Any modification to Open311 field names, response structure, or authentication mechanism is a breaking change and requires a version bump.

**Failure mode:** If the application is unavailable, integrators will receive connection refused or gateway errors from the K8s ingress. No circuit-breaker or retry logic is implemented at the application layer — K8s pod restarts and readiness probe guard against serving stale/broken responses.

---

### Y3.6: Pivota Kubernetes Platform

**Purpose:** Runtime environment — pod scheduling, health checks, environment variable injection.

**Integration type:** Declarative via `infrastructure.json` and Kubernetes probes.

**Contract:**
```json
// infrastructure.json (repo root)
{
  "sidecar_requirements": ["postgres"],
  "port": 3000
}
```

- `PIVOTA_DB_MODE=sidecar-postgres` env var is set by the platform.
- Liveness probe: `GET /api/health/live` — should return `200` within 2 seconds.
- Readiness probe: `GET /api/health/ready` — should return `200` before traffic is routed. Initial delay: 15 seconds; period: 10 seconds.
- Pod runs as single process on port 3000.

**CSP/Framing constraint:** The app must NOT emit `X-Frame-Options: DENY/SAMEORIGIN` or CSP `frame-ancestors 'none'` because Pivota Preview embeds the app in an iframe. This is a hard platform requirement.

---

### Y3.7: Leaflet + react-leaflet (Client Library)

**Purpose:** Interactive map rendering in browser for all map views.

**Integration type:** npm package bundled with the application. No external service call except OSM tiles.

**SSR constraint:** Leaflet components must be dynamically imported with `{ ssr: false }` in Next.js App Router to avoid hydration mismatch errors (Leaflet accesses `window` at initialization). All Leaflet-dependent components must be wrapped in `'use client'` boundaries.

**Clustering:** `leaflet.markercluster` library used for public map (F01) and staff queue map view (F03). License: MIT.

---

### Integration Dependency Summary

| Integration | Type | Required | Graceful Degradation |
|-------------|------|----------|---------------------|
| PostgreSQL 16 (sidecar) | Server-side | Yes — hard dependency | None; readiness probe blocks traffic |
| PostGIS extension | Server-side | No — optional | Haversine fallback for geo queries |
| Auth.js | Server-side library | Yes | None; app fails to start without AUTH_SECRET |
| Nominatim / OSM Geocoding | Client-side HTTP | No — map pin fallback | Address search shows warning; submission unaffected |
| OSM Tile Server | Client-side tiles | No | Grey map background; app fully functional |
| Open311 external clients | Inbound | No | They receive errors; no app-side degradation |
| Pivota K8s platform | Deployment | Yes | N/A — platform provides runtime |
| Leaflet (npm) | Client library | Yes — for map views | N/A — bundled; no external network call |

---
