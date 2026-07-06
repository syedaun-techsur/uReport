# User Stories
## uReport NG — City of Bloomington Municipal 311/CRM

| Field | Value |
|---|---|
| **Product Name** | uReport NG |
| **Project Acronym** | uReportNG |
| **Version** | 1.0 |
| **Date** | 2026-07-06 |
| **Status** | Active |
| **Related PRD** | PRD-uReportNG.md |
| **Related FRD** | FRD-uReportNG.md |
| **Related Personas** | PERSONAS-uReportNG.md |

---

## Priority Definitions

| Level | Meaning |
|---|---|
| **P0** | Critical — required for MVP / initial deployment; system cannot operate without it |
| **P1** | High — required for launch but non-blocking for initial pod bring-up |
| **P2** | Medium — planned for next iteration |
| **P3** | Low — nice to have; deferred |

---

## Personas

| ID | Name | Role |
|---|---|---|
| PER-01 | Marcus Webb | Public Constituent |
| PER-02 | Diane Kowalski | City Staff — 311 Coordinator |
| PER-03 | Renata Osei | City Administrator |
| PER-04 | Liam Tran | Third-Party Integrator |

---

## Epic 0: Public Constituent Portal (F0)

*Enables city residents to report municipal issues via a map-first, responsive, accessible reporting flow. Anonymous submissions supported per category configuration.*

---

### US-0.1: Drop a Map Pin to Report an Issue Location
**As a** Marcus Webb (public constituent), **I want to** click a point on an interactive map to mark the exact location of an issue, **so that** city staff know precisely where to send a crew without me needing to know the street address.

**Acceptance Criteria:**
- [ ] The public portal home page (`/`) renders a Leaflet/OpenStreetMap map centered on the city's configured coordinates (`CITY_CENTER_LAT`, `CITY_CENTER_LNG`) at zoom level 13
- [ ] Clicking anywhere on the map places a draggable pin at that location
- [ ] The pin's lat/lng coordinates are captured and passed to the submission form
- [ ] If the pin is placed outside the configured city bounding box, a non-blocking warning is displayed but submission is not blocked
- [ ] Map renders correctly on mobile browsers (iOS Safari 16+, Android Chrome) without horizontal scroll
- [ ] Map controls (zoom, pin placement) are keyboard-navigable with visible focus indicators
- [ ] Leaflet is dynamically imported (`{ ssr: false }`) to prevent SSR hydration mismatches

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.2: Search an Address to Set the Issue Location
**As a** Marcus Webb, **I want to** type a street address and select it from autocomplete suggestions, **so that** I can report a location accurately even if I'm not standing directly at the spot.

**Acceptance Criteria:**
- [ ] An address search input field is present alongside the map
- [ ] Typing at least 3 characters triggers a debounced (300ms) query to Nominatim/OSM
- [ ] Up to 5 candidate addresses are shown in a dropdown
- [ ] Selecting a candidate places the map pin at the corresponding lat/lng and populates the address field
- [ ] If Nominatim is unavailable, the search field shows "Address search temporarily unavailable" and the map pin entry method remains fully functional
- [ ] The `GEOCODE_UNAVAILABLE` warning does not block ticket submission

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.3: Select a Category and Submit a Description
**As a** Marcus Webb, **I want to** pick the type of issue from a list and describe it in my own words, **so that** my report is routed to the correct city department and staff understand what to look for.

**Acceptance Criteria:**
- [ ] A category dropdown lists all active categories only (populated via `GET /api/categories`)
- [ ] After selecting a category, the routing department name is displayed below the selector
- [ ] A free-text description field accepts 10–4,000 characters
- [ ] A description shorter than 10 characters shows an inline validation error before submission
- [ ] All required fields are validated client-side before the form is POSTed
- [ ] The server also validates all fields (Zod schema) and returns field-level errors on `422`
- [ ] Category selection and description entry work with keyboard and screen reader (ARIA labels, visible focus states)

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.4: Attach a Photo to a Report
**As a** Marcus Webb, **I want to** upload a photo of the issue directly from my phone, **so that** city staff can see the condition without an in-person visit.

**Acceptance Criteria:**
- [ ] A file input control allows attaching up to 5 files per submission
- [ ] Accepted MIME types: `image/*` and `application/pdf`; other types show `MEDIA_TYPE_INVALID` error
- [ ] Each file is capped at 10MB (configurable via `MEDIA_MAX_SIZE_MB`); oversized files show `MEDIA_TOO_LARGE` error
- [ ] Attached files are stored in Postgres (bytea / Large Object) — no local filesystem writes
- [ ] Photo attachment is optional; the form can be submitted without any files

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.5: Submit Anonymously or with Contact Information
**As a** Marcus Webb, **I want to** report a pothole without providing my name or email when the category allows it, **so that** I can flag a city issue without sharing personal information.

**Acceptance Criteria:**
- [ ] When the selected category has `anon_allowed = true`, contact fields (name, email, phone) are labeled "Optional — leave blank to submit anonymously"
- [ ] When `anon_allowed = false`, name and email fields are marked required and submission fails with `CONTACT_REQUIRED` if absent
- [ ] Providing an email stores a `Person` record and `TicketPerson` join within the same Prisma transaction as the `Ticket`
- [ ] Phone is always optional regardless of category setting
- [ ] Email format is validated (`z.string().email()`) if provided

**Priority:** P0 | **Feature Ref:** F0

---

### US-0.6: Receive a Confirmation with Ticket ID
**As a** Marcus Webb, **I want to** see a confirmation screen with a ticket ID immediately after I submit my report, **so that** I know the city received it and I have a reference number to follow up later.

**Acceptance Criteria:**
- [ ] On successful `POST /api/tickets` (HTTP 201), the client navigates to `/tickets/[id]/confirm`
- [ ] The confirmation page displays the ticket reference ID prominently
- [ ] A direct link to `/tickets/[id]` for status tracking is shown
- [ ] A "Copy link" or "Save this ID" prompt encourages the user to retain the reference
- [ ] The confirmation page is accessible without authentication
- [ ] Submission success rate is target >99% — any DB write failure returns `500 SUBMISSION_FAILED` with a user-friendly retry message

**Priority:** P0 | **Feature Ref:** F0

---

## Epic 1: Constituent Issue Tracking (F1)

*Allows any visitor (no login required) to look up a submitted ticket's status by ID and view a public map of all open issues.*

---

### US-1.1: Look Up a Ticket Status by ID
**As a** Marcus Webb, **I want to** enter my ticket ID on the city's website and see the current status of my report, **so that** I know whether the city has started working on it without calling 311.

**Acceptance Criteria:**
- [ ] Navigating to `/tickets/[id]` displays the ticket's public status page without requiring login
- [ ] Page shows: reference ID, category name, status (human-readable), substatus public label (if set), submission date, last-updated date, address
- [ ] Any staff response notes marked `is_public = true` are displayed on this page
- [ ] Internal staff notes (`is_public = false`) are never exposed on the public page
- [ ] If the ticket ID is not found, a "Ticket not found" page is rendered with HTTP 404
- [ ] A Leaflet mini-map shows the ticket pin location
- [ ] A "Copy link" button allows sharing the URL (`/tickets/[id]`)
- [ ] The page is responsive and WCAG 2.1 AA compliant

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.2: View a Public Map of All Open Issues
**As a** Marcus Webb, **I want to** see a map of all currently reported and open issues near my neighborhood, **so that** I can check whether someone already reported the same problem before I submit a duplicate.

**Acceptance Criteria:**
- [ ] The public map (`/map` or a map tab on the home page) loads without authentication
- [ ] The map displays all tickets with `status IN (open, in_progress)` as markers via Leaflet
- [ ] Markers are clustered using Leaflet.markercluster at zoom levels below 14
- [ ] Clicking a cluster zooms in and expands individual markers
- [ ] Clicking an individual marker opens a popup showing: category icon, category name, status badge, address snippet, and a "View details →" link to `/tickets/[id]`
- [ ] The `GET /api/tickets/public-map` endpoint returns a GeoJSON FeatureCollection capped at 5,000 features
- [ ] Map data is refreshed if the tab becomes active after more than 5 minutes of inactivity

**Priority:** P0 | **Feature Ref:** F1

---

### US-1.3: Share a Direct Link to a Ticket
**As a** Marcus Webb, **I want to** share a stable URL for my ticket with a neighbor, **so that** they can check the same issue's status without me needing to explain the steps.

**Acceptance Criteria:**
- [ ] Each ticket has a stable URL of the form `/tickets/[id]` that can be bookmarked or shared
- [ ] Deep-link URLs resolve correctly with the full public status page regardless of how the link was opened
- [ ] The URL does not change if the ticket status changes

**Priority:** P0 | **Feature Ref:** F1

---

## Epic 2: Authentication & Role-Based Sessions (F2)

*Credential-based login via Auth.js. Three roles: `public`, `staff`, and `admin`. Route-level guards protect all staff and admin pages.*

---

### US-2.1: Log In with Staff Credentials
**As a** Diane Kowalski (city staff), **I want to** log in with my username and password, **so that** I can access the staff ticket queue and begin my daily triage.

**Acceptance Criteria:**
- [ ] A login page is accessible at `/login`
- [ ] Submitting valid username/password creates a signed JWT session cookie and redirects to `/staff/tickets` (or to `callbackUrl` if redirected from a protected route)
- [ ] Invalid credentials show the message "Invalid username or password" without revealing whether the username exists (no enumeration)
- [ ] Inactive accounts show the same generic error message
- [ ] Session cookie is httpOnly, SameSite=Lax, and Secure in production
- [ ] Default session TTL is 8 hours (configurable via `AUTH_SESSION_TTL`)
- [ ] On session expiry, the user is redirected to `/login?callbackUrl=<original_path>`

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.2: Access Staff and Admin Routes Securely
**As a** Diane Kowalski, **I want to** be automatically redirected to the login page when I try to access a staff page without being logged in, **so that** constituent data is protected from unauthorized access.

**Acceptance Criteria:**
- [ ] All routes under `/staff/**` redirect unauthenticated requests to `/login?callbackUrl=<path>`
- [ ] All routes under `/admin/**` redirect unauthenticated requests to `/login?callbackUrl=<path>`
- [ ] A `staff` role user attempting to access any `/admin/**` route receives a 403 error and is redirected to `/staff/tickets`
- [ ] An `admin` role user can access both `/staff/**` and `/admin/**` routes
- [ ] API route handlers enforce role checks server-side via `auth()` regardless of middleware state

**Priority:** P0 | **Feature Ref:** F2

---

### US-2.3: Change My Own Password
**As a** Diane Kowalski, **I want to** change my password from within the application, **so that** I can maintain my account security without calling IT.

**Acceptance Criteria:**
- [ ] A password change form is accessible at `/staff/account/password` for authenticated staff/admin users
- [ ] Submitting current password, new password, and confirmation updates the stored bcrypt hash
- [ ] New password must be ≥12 characters, contain ≥1 uppercase letter, and ≥1 digit; violations return `PASSWORD_POLICY` error
- [ ] If the current password is wrong, `WRONG_PASSWORD` error is returned
- [ ] If the new password and confirmation do not match, `PASSWORD_MISMATCH` error is returned
- [ ] On success, all other active sessions for the user are invalidated (token version incremented)
- [ ] On success, the user is redirected to `/staff/account` with a success toast

**Priority:** P0 | **Feature Ref:** F2

---

## Epic 3: Staff Ticket Queue (F3)

*The primary staff workspace: a filterable, searchable, paginated list with saved filter bookmarks and bulk actions.*

---

### US-3.1: View and Filter the Daily Ticket Queue
**As a** Diane Kowalski, **I want to** load the ticket queue filtered by my department, category, and status, **so that** I only see the tickets relevant to my work and don't waste time scanning unrelated reports.

**Acceptance Criteria:**
- [ ] The staff ticket queue is available at `/staff/tickets` (requires staff or admin role)
- [ ] The queue displays a paginated list (default 25 per page, max 100) with columns: ID, category, department, status, substatus, assignee, created date, updated date
- [ ] Filter panel supports: category, department, status/substatus, assignee, date range (from/to), geographic bounding box
- [ ] Applying filters updates the URL query params and re-fetches the list
- [ ] `date_from` must be ≤ `date_to`; an invalid date range returns a `DATE_RANGE_INVALID` error message
- [ ] `bbox` filter accepts `minLat,minLng,maxLat,maxLng`; invalid format shows `BBOX_INVALID` error
- [ ] Sort controls allow sorting by created date, updated date (ascending or descending)
- [ ] A quick-view popover appears on row hover showing a summary of the ticket

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.2: Search Tickets by Keyword or Address
**As a** Diane Kowalski, **I want to** type a keyword, address fragment, or description snippet to find a specific ticket, **so that** I can locate a report in under 30 seconds when a constituent calls in to follow up.

**Acceptance Criteria:**
- [ ] A search input field accepts free-text queries (up to 500 characters)
- [ ] Submitting a query performs a Postgres FTS search against ticket description and address fields (`search_vector` tsvector column with GIN index)
- [ ] FTS query results are returned in under 500ms at p95
- [ ] Search results can be combined with all filter panel parameters (category, status, date, etc.)
- [ ] Searching with no results displays an empty state message rather than an error

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.3: Save and Load a Queue Filter Bookmark
**As a** Diane Kowalski, **I want to** save my current filter configuration as a named bookmark and reload it the next morning, **so that** I start every day in my pre-filtered queue without re-entering the same six filters.

**Acceptance Criteria:**
- [ ] A "Save View" button opens a dialog to name and save the current filter state as a `BookmarkedFilter` record linked to my user account
- [ ] Saved bookmarks appear in a "Saved Views" dropdown/sidebar accessible from the queue page
- [ ] Loading a bookmark restores all filter fields and re-fetches the queue
- [ ] Each user can have multiple bookmarks; bookmark names must be unique per user (duplicate names return `409 CONFLICT`)
- [ ] Bookmarks can be renamed and deleted via the UI
- [ ] Bookmarks are persisted server-side and survive browser refreshes and session expiry

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.4: Bulk-Update Status or Assignee on Multiple Tickets
**As a** Diane Kowalski, **I want to** select a set of tickets and close or reassign them all in one action, **so that** I can process a batch of resolved pothole tickets after a repaving project without editing each one individually.

**Acceptance Criteria:**
- [ ] Checkboxes on each queue row allow selecting individual tickets; a header checkbox selects all on the current page
- [ ] A bulk action bar appears when at least one ticket is selected, offering "Update Status" and "Assign To" actions
- [ ] Bulk updates are sent via `PATCH /api/staff/tickets/bulk` with up to 100 ticket IDs per request
- [ ] Attempting a bulk action with no tickets selected returns `BULK_EMPTY` error
- [ ] Attempting a bulk action with more than 100 tickets returns `BULK_TOO_LARGE` error
- [ ] Each individual ticket update within the bulk operation creates a `TicketHistory` entry with the acting user's ID
- [ ] The response reports the count of updated tickets and any failed IDs

**Priority:** P0 | **Feature Ref:** F3

---

### US-3.5: Toggle Map View to Visualize the Queue Geographically
**As a** Diane Kowalski, **I want to** switch my filtered ticket queue to a map view, **so that** I can see where clusters of open issues are concentrated and plan field assignments efficiently.

**Acceptance Criteria:**
- [ ] A "Map View" toggle button switches the queue from list view to a Leaflet map showing all filtered tickets as markers
- [ ] The map view respects all active filters (category, status, date range, etc.) — only filtered tickets are shown
- [ ] Markers cluster at low zoom levels using Leaflet.markercluster
- [ ] Clicking a marker opens a popup with ticket summary and a "View ticket" link to the detail page
- [ ] Returning to list view restores the previous filter and pagination state

**Priority:** P0 | **Feature Ref:** F3

---

## Epic 4: Staff Ticket Detail (F4)

*Full single-ticket workspace for staff: history timeline, status controls, assignment, responses, templates, media gallery, and linked constituent.*

---

### US-4.1: View Complete Ticket Information on One Screen
**As a** Diane Kowalski, **I want to** see everything about a ticket — its location, full history, current status, and any notes — on a single page, **so that** I can understand the full context before taking action.

**Acceptance Criteria:**
- [ ] The ticket detail page (`/staff/tickets/[id]`) displays: ticket ID and reference, category, department, address, a Leaflet mini-map with the issue pin
- [ ] A chronological history timeline shows all `TicketHistory` entries (status changes, assignments, responses, media uploads) with timestamps and actor names
- [ ] Timeline entries are rendered with distinct icons for each action type: `STATUS_CHANGE`, `ASSIGNMENT`, `RESPONSE`, `MEDIA_ADDED`, `SUBSTATUS_CHANGE`
- [ ] A "Related Tickets" panel shows tickets at the same address (within ~50m) or linked to the same `Person`
- [ ] The page loads all ticket relations in a single server fetch (category, department, substatus, assignee, history, responses, media, persons)

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.2: Update Ticket Status and Substatus
**As a** Diane Kowalski, **I want to** change a ticket's status (e.g., from "Open" to "Closed") with a confirmation step and optional note, **so that** the constituent's tracking page reflects the work we've done.

**Acceptance Criteria:**
- [ ] A status selector dropdown shows all valid statuses (`open`, `in_progress`, `closed`, `archived`)
- [ ] Selecting a new status triggers a confirmation dialog showing old status → new status and a field for an optional internal note
- [ ] On confirm, the server updates `Ticket.status` and appends a `TicketHistory` row with `action = "STATUS_CHANGE"`
- [ ] A substatus selector is conditionally shown and only lists substatuses belonging to the current status bucket
- [ ] Selecting a mismatched substatus returns `SUBSTATUS_MISMATCH` error
- [ ] Re-opening a `closed` ticket (changing `closed` → `open`) is restricted to `admin` role; staff attempting this receive `403 TRANSITION_FORBIDDEN`
- [ ] An optional note provided during status change is stored as an internal `Response` (`is_public = false`)

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.3: Assign a Ticket to a Staff Member
**As a** Diane Kowalski, **I want to** assign a ticket to a specific staff member from a typeahead search, **so that** accountability is clear and the right person is notified.

**Acceptance Criteria:**
- [ ] An assignee picker field allows typing to search active staff users via `GET /api/staff/users?q=...`
- [ ] Selecting an assignee sends `PATCH /api/staff/tickets/[id]` with `{ assignee_id }`
- [ ] The server appends a `TicketHistory` row with `action = "ASSIGNMENT"`
- [ ] If the provided `assignee_id` does not match an active user, `USER_NOT_FOUND` error is returned
- [ ] Clearing the assignee (setting to null) is supported and also creates a history entry

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.4: Write an Internal Note or Public Response
**As a** Diane Kowalski, **I want to** write a staff-only note or a public-facing response on a ticket, **so that** I can record investigation progress internally and communicate updates to the constituent when appropriate.

**Acceptance Criteria:**
- [ ] A response composition area includes a toggle between "Internal note" and "Public response"
- [ ] Internal notes (`is_public = false`) are visible only to authenticated staff/admin; they do not appear on the constituent tracking page
- [ ] Public responses (`is_public = true`) are visible on the constituent's `/tickets/[id]` page
- [ ] Submitting an empty (whitespace-only) response body returns `EMPTY_RESPONSE` error
- [ ] Response body accepts up to 10,000 characters
- [ ] A `TicketHistory` entry with `action = "RESPONSE"` is created for each submitted response

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.5: Insert a Canned Response Template
**As a** Diane Kowalski, **I want to** select a pre-written response template and have its placeholders auto-filled with ticket details, **so that** I can send consistent, accurate responses to constituents faster.

**Acceptance Criteria:**
- [ ] A template picker dropdown lists all active `ResponseTemplate` records (filtered by the ticket's category or department if set)
- [ ] Selecting a template inserts its body into the response textarea
- [ ] Placeholder tokens are substituted client-side before insertion: `{{ticket_id}}` → ticket reference ID, `{{address}}` → ticket address, `{{category_name}}` → category name
- [ ] The server stores the final rendered text (with substitutions applied); `template_id` is stored for audit only
- [ ] The inserted text can be freely edited before submission

**Priority:** P0 | **Feature Ref:** F4

---

### US-4.6: View, Download, and Upload Ticket Media
**As a** Diane Kowalski, **I want to** view photos attached to a ticket, download originals, and add additional files, **so that** I can see the reported condition and attach documentation of the work done.

**Acceptance Criteria:**
- [ ] All `Media` records linked to a ticket are displayed in a gallery on the detail page
- [ ] Each media item includes its filename, MIME type, and upload timestamp
- [ ] Clicking a media item opens a preview (inline for images, download for PDFs)
- [ ] A "Download" action retrieves the file via `GET /api/media/[id]` with correct `Content-Type` and `Content-Disposition` headers
- [ ] Staff can upload additional files (same rules as F0: ≤5 files, ≤10MB each, `image/*` or `application/pdf` only)
- [ ] Each upload creates a `TicketHistory` row with `action = "MEDIA_ADDED"`
- [ ] Media files are served from Postgres — no local filesystem reads

**Priority:** P0 | **Feature Ref:** F4

---

## Epic 5: Staff CRM / People Management (F5)

*Lightweight CRM for linking tickets to constituents, de-duplicating contacts, and viewing full constituent interaction history.*

---

### US-5.1: Search for a Constituent Contact Record
**As a** Diane Kowalski, **I want to** search for a person by name, email, or phone to find their contact record, **so that** when a constituent calls in I can quickly pull up their full history with the city.

**Acceptance Criteria:**
- [ ] A people search page is accessible at `/staff/people` (requires staff or admin role)
- [ ] The search accepts a query of at least 2 characters (name, email, or phone fragment)
- [ ] Results are returned via Postgres FTS against the `person_search_vector` tsvector column
- [ ] The search returns a paginated list with name, email snippet, linked ticket count, and last activity date
- [ ] Clicking a result opens the `Person` detail view with all linked tickets
- [ ] Anonymized persons display as "Anonymous Constituent" — no PII is shown

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.2: View a Constituent's Full Ticket History
**As a** Diane Kowalski, **I want to** open a constituent's record and see every ticket they've ever submitted or been linked to, **so that** I can understand their history and avoid sending them duplicative responses.

**Acceptance Criteria:**
- [ ] The `Person` detail page shows: name, email, phone, preferred contact method, and notes
- [ ] All `TicketPerson` relationships are listed as linked tickets with summary (ID, category, status, date)
- [ ] Tickets are sorted by most-recent first
- [ ] A link from each ticket summary navigates directly to the staff ticket detail page
- [ ] The detail page is accessible only to authenticated staff/admin (no public access to PII)

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.3: Link or Unlink a Person to a Ticket
**As a** Diane Kowalski, **I want to** manually link a constituent's record to a ticket or remove an incorrect link, **so that** constituent history is accurate when someone calls about a ticket they didn't submit with their contact info.

**Acceptance Criteria:**
- [ ] From the "Linked Constituent" panel on the ticket detail page, a "Link Person" button opens a search modal
- [ ] Searching and selecting a person creates a `TicketPerson` row via `POST /api/staff/tickets/[id]/persons` with role `contact`
- [ ] A `TicketHistory` entry with `action = "PERSON_LINKED"` is created
- [ ] Unlinking a person is available via a remove button, sending `DELETE /api/staff/tickets/[id]/persons/[person_id]`
- [ ] Staff cannot unlink the original `submitter` role without admin privilege; attempting this returns `403 FORBIDDEN`
- [ ] Admins can unlink the original submitter with the same interface

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.4: Merge Duplicate Constituent Records
**As a** Diane Kowalski, **I want to** merge two constituent records that represent the same person into a single canonical record, **so that** their combined ticket history is visible in one place and we stop sending duplicate communications.

**Acceptance Criteria:**
- [ ] A "Merge with…" action on a `Person` detail page opens a search modal to select the target (canonical) person
- [ ] Confirming the merge sends `POST /api/staff/people/merge` with `{ source_id, target_id }`
- [ ] The server re-points all `TicketPerson` rows from source to target in a single Prisma transaction
- [ ] Non-null fields from the source are copied to the target where the target field is null
- [ ] The source record is soft-deleted (`deleted_at = now()`) with `merged_into_id` set to the target
- [ ] A `TicketHistory` note is appended to each affected ticket: "Person records merged by [actor]"
- [ ] Merging a record into itself returns `422 MERGE_SAME` error
- [ ] Merging an anonymized record returns `422 PERSON_ANONYMIZED` error

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.5: Anonymize a Constituent Record on Request
**As a** Renata Osei (city administrator), **I want to** permanently remove all personal information from a constituent record upon their request, **so that** the city complies with data minimization obligations without losing the linked ticket history.

**Acceptance Criteria:**
- [ ] An "Anonymize Record" button on the `Person` detail page is available to staff and admin roles
- [ ] A confirmation dialog warns: "All personal information will be permanently removed"
- [ ] On confirmation, server nulls `name`, `email`, `phone`, and `notes` and sets `anonymized_at = now()`
- [ ] Linked tickets remain intact; their display shows "Anonymous Constituent" instead of the person's name
- [ ] Attempting to anonymize an already-anonymized record returns `409 ALREADY_ANONYMIZED`
- [ ] An audit log entry is created: `action = "PERSON_ANONYMIZED"` with actor ID and timestamp
- [ ] Anonymization is irreversible — no "undo" option is presented

**Priority:** P1 | **Feature Ref:** F5

---

## Epic 6: Admin Panel (F6)

*Back-office configuration for system administrators: categories, departments, substatuses, response templates, user accounts, and Open311 API keys.*

---

### US-6.1: Manage Service Categories
**As a** Renata Osei, **I want to** create, edit, and deactivate service categories through a UI, **so that** I can add seasonal categories or retire outdated ones without touching code or restarting the pod.

**Acceptance Criteria:**
- [ ] The category management screen is at `/admin/categories` (requires admin role)
- [ ] The list shows all categories (active and inactive), grouped by CategoryGroup and sorted by name
- [ ] A "Create Category" form drawer accepts: name (required, unique among active), description, icon (lucide icon name), color (hex `#RRGGBB`), department, `anon_allowed` toggle, `active` toggle, and Open311 `service_code`
- [ ] `service_code` must be unique across ALL categories (active and inactive); duplicate returns `409 DUPLICATE_SERVICE_CODE`
- [ ] `color` must match `#RRGGBB` pattern if provided; invalid format shows a validation error
- [ ] `department_id` must reference an active department; selecting an inactive department shows an error
- [ ] Deactivating a category with open tickets displays a warning count but allows deactivation
- [ ] Changes take effect immediately in the live system — no pod restart required

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.2: Manage Departments and Default Assignees
**As a** Renata Osei, **I want to** create, edit, and deactivate city departments and set their default ticket assignee, **so that** new ticket routing works correctly without requiring a developer.

**Acceptance Criteria:**
- [ ] The department management screen is at `/admin/departments` (requires admin role)
- [ ] A create/edit form accepts: department name (required, unique among active) and optional default assignee (staff/admin user)
- [ ] `default_assignee_id` must reference an active staff or admin user; inactive user selection shows an error
- [ ] Deactivating a department that has active categories shows a warning and requires confirmation
- [ ] Department names are unique among active departments; duplicate returns a validation error

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.3: Configure Custom Substatuses
**As a** Renata Osei, **I want to** create and order custom substatus labels for each workflow status, **so that** staff can record more precise progress states without the system being rigid.

**Acceptance Criteria:**
- [ ] The substatus management screen is at `/admin/substatuses` (requires admin role)
- [ ] Substatuses are grouped by parent status bucket: `open`, `in_progress`, `closed`, `archived`
- [ ] A create/edit form accepts: public label (required, ≤100 chars, unique within parent status), internal label (optional), parent status, sort order, and active toggle
- [ ] Drag-to-reorder sends a batch `PATCH /api/admin/substatuses/reorder` to update `sort_order` fields
- [ ] Deactivated substatuses no longer appear in the staff ticket detail substatus selector

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.4: Manage Canned Response Templates
**As a** Renata Osei, **I want to** create and manage response templates with dynamic placeholders, **so that** staff send consistent, accurate communications and don't type the same responses from scratch every day.

**Acceptance Criteria:**
- [ ] The template management screen is at `/admin/response-templates` (requires admin role)
- [ ] A create/edit form accepts: name (required, unique among active), body (required, ≤10,000 characters), optional category filter, optional department filter, and active toggle
- [ ] Supported placeholder tokens are `{{ticket_id}}`, `{{address}}`, `{{category_name}}`; unknown `{{...}}` tokens show a warning (not a blocking error)
- [ ] Templates can be deactivated; deactivated templates no longer appear in the staff ticket detail template picker

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.5: Create and Manage Staff User Accounts
**As a** Renata Osei, **I want to** create new staff accounts, deactivate departing employees, and reset passwords — all through the admin UI, **so that** account lifecycle is managed without developer involvement.

**Acceptance Criteria:**
- [ ] The user management screen is at `/admin/users` (requires admin role)
- [ ] A create user form accepts: username (required, unique, alphanumeric + `_` + `-`), email (required, unique, valid email), initial password (must meet policy: ≥12 chars, ≥1 uppercase, ≥1 digit), role (`staff` or `admin`), and optional department assignment
- [ ] Duplicate username returns `409 DUPLICATE_USERNAME`; duplicate email returns `409 DUPLICATE_EMAIL`
- [ ] Deactivating an account (`active = false`) prevents that user from logging in; existing sessions expire naturally
- [ ] Admin-initiated password reset (`POST /api/admin/users/[id]/reset-password`) updates the hash and increments `token_version`, immediately invalidating all active sessions for that user
- [ ] An admin cannot deactivate their own account; attempting this returns `403 SELF_DEACTIVATION`
- [ ] New accounts are active immediately upon creation — no email verification flow in v1

**Priority:** P0 | **Feature Ref:** F6

---

### US-6.6: Generate and Revoke Open311 API Keys
**As a** Renata Osei, **I want to** generate scoped API keys for integration partners and revoke them instantly if needed, **so that** third-party access is controlled and auditable without any database commands.

**Acceptance Criteria:**
- [ ] The API key management screen is at `/admin/api-keys` (requires admin role)
- [ ] Clicking "Generate Key" creates a 32-byte random hex key, stores only its SHA-256 hash, and displays the plaintext key **once** in a dismissible modal (cannot be retrieved again)
- [ ] The admin assigns a label (required, unique among active keys, ≤100 chars) and a scope (`read` or `write`)
- [ ] The key list shows: label, scope, created date, last-used timestamp, and status (active/revoked)
- [ ] Revoking a key sets `revoked_at = now()`; revoked keys return HTTP 401 on any subsequent use
- [ ] Attempting to revoke an already-revoked key returns `409 ALREADY_REVOKED`
- [ ] `read`-scoped keys can only use GET endpoints; using them on POST returns `403 key_read_only`

**Priority:** P0 | **Feature Ref:** F6

---

## Epic 7: Open311 GeoReport v2 API (F7)

*Fully backward-compatible Open311 GeoReport v2 API surface for third-party integrators. Zero field-level regressions from legacy system.*

---

### US-7.1: Retrieve the List of Active Service Categories
**As a** Liam Tran (third-party integrator), **I want to** call `GET /api/v2/services` to get the current list of available service categories, **so that** my app can display the correct options to users and keep my local cache up to date.

**Acceptance Criteria:**
- [ ] `GET /api/v2/services` returns an array of service objects without requiring authentication
- [ ] Each object includes exactly the GeoReport v2 fields: `service_code`, `service_name`, `description`, `metadata`, `type`, `keywords`, `group`
- [ ] `metadata` is always `false` (no extended attributes in v1); `type` is always `"realtime"`
- [ ] Only active categories are returned; inactive categories are excluded
- [ ] The response is JSON by default; passing `?format=xml` or `Accept: application/xml` returns a valid `<services>` XML document
- [ ] XML element names match the Open311 spec exactly

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.2: Submit a Service Request via the API
**As a** Liam Tran, **I want to** `POST /api/v2/requests` with a valid API key and receive a `service_request_id`, **so that** my app can submit reports on behalf of residents and track them by ID.

**Acceptance Criteria:**
- [ ] `POST /api/v2/requests` requires a valid API key passed as `api_key` query param or `X-Api-Key` header
- [ ] A missing or invalid key returns `401` with `{ "errors": [{ "code": "key_not_found", "description": "API key was not found" }] }`
- [ ] A `read`-scoped key on POST returns `403` with `{ "errors": [{ "code": "key_read_only", ... }] }`
- [ ] Required fields: `service_code` (valid active category), `description` (≥10 chars), and either `lat`+`long` or `address_string`
- [ ] Open311 field `long` (not `lng`) is used for longitude in request and response
- [ ] A successful submission returns HTTP 201 with an array containing one `service_request` object including `service_request_id`, `service_code`, `status`, `requested_datetime`
- [ ] The created ticket is linked to a `Person` record if `first_name`, `last_name`, or `email` are provided
- [ ] `ApiKey.last_used_at` is updated on every successful authenticated request

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.3: Query and Filter Service Requests
**As a** Liam Tran, **I want to** query `GET /api/v2/requests` with filters for service code, status, and date range, **so that** my application can sync new or updated tickets into its local cache without downloading the entire dataset.

**Acceptance Criteria:**
- [ ] `GET /api/v2/requests` is public (no auth required) with configurable rate limiting (default 60 req/min per IP via `OPEN311_RATE_LIMIT`)
- [ ] Supported query parameters: `service_request_id`, `service_code`, `status` (`open`|`closed`), `start_date`, `end_date`, `page`, `page_size` (max 100)
- [ ] Open311 `status=open` maps internally to `Ticket.status IN ('open', 'in_progress')`; `status=closed` maps to `IN ('closed', 'archived')`
- [ ] Pagination via `page` and `page_size` is supported; no response timeouts on large corpora
- [ ] Response field names match the GeoReport v2 spec exactly: `service_request_id`, `lat`, `long`, `requested_datetime`, `updated_datetime`, `status_notes`, `agency_responsible`, `service_name`, `service_code`
- [ ] Rate limit exceeded returns HTTP 429 with `Retry-After` header
- [ ] Both JSON and XML response formats are supported

**Priority:** P0 | **Feature Ref:** F7

---

### US-7.4: Retrieve a Single Service Request by ID
**As a** Liam Tran, **I want to** call `GET /api/v2/requests/{service_request_id}` to get the latest status of a specific ticket, **so that** my app can display real-time status updates to the resident who submitted the report.

**Acceptance Criteria:**
- [ ] `GET /api/v2/requests/{service_request_id}` returns an array with one `service_request` object (as per Open311 spec — single-item responses are still wrapped in an array)
- [ ] If the `service_request_id` does not exist, the endpoint returns HTTP 404
- [ ] All standard GeoReport v2 response fields are present including `status_notes` (latest public response body, or null)
- [ ] The endpoint is public (no authentication required) and subject to rate limiting
- [ ] `format=xml` and `Accept: application/xml` content negotiation works identically to the list endpoint

**Priority:** P0 | **Feature Ref:** F7

---

## Epic 8: Reports & Metrics Dashboard (F8)

*Analytics dashboard for staff and admins: volume charts, resolution time, open/closed breakdown, geographic density, and CSV export.*

---

### US-8.1: View Ticket Volume Trends by Category and Department
**As a** Diane Kowalski, **I want to** see a chart of how many tickets were submitted per category and department over a configurable date range, **so that** I can identify seasonal spikes and plan staffing accordingly.

**Acceptance Criteria:**
- [ ] The reports dashboard is accessible at `/staff/reports` (requires staff or admin role)
- [ ] A date range picker offers presets (Last 7d, 30d, 90d) and a custom date range input
- [ ] A "Volume by Category" bar/line chart displays ticket counts grouped by category over the selected period
- [ ] A "Volume by Department" chart displays the same data grouped by department
- [ ] Chart data is fetched from `GET /api/staff/reports/volume-by-category` and `volume-by-department` with `start_date`, `end_date`, and `interval` (day/week/month)
- [ ] `start_date` must be ≤ `end_date`; date range cannot exceed 366 days; violations return `DATE_RANGE_INVALID` or `DATE_RANGE_TOO_WIDE` error messages
- [ ] All chart components fetch their data independently in parallel on page load

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.2: View Open vs. Closed Breakdown and Average Resolution Time
**As a** Renata Osei, **I want to** see how many tickets are open versus closed and how long it takes on average to close them, **so that** I can report service level metrics to city leadership.

**Acceptance Criteria:**
- [ ] An "Open vs. Closed" donut chart shows counts for all four statuses: `open`, `in_progress`, `closed`, `archived`
- [ ] Clicking a donut segment navigates to the staff ticket queue filtered by that status
- [ ] An "Average Resolution Time" chart shows mean and median close time per category and per department
- [ ] Resolution time is computed from ticket creation to the first `TicketHistory` entry where `to_value = 'closed'`
- [ ] Results are rendered as a horizontal bar chart with `group_name`, `mean_hours`, `median_hours`, and `count`
- [ ] All charts update when the date range picker is changed

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.3: View a Geographic Density Map of Ticket Activity
**As a** Diane Kowalski, **I want to** see a heat map or cluster map of where tickets are concentrated geographically, **so that** I can identify problem areas and plan preventive maintenance.

**Acceptance Criteria:**
- [ ] A geographic density section of the reports dashboard renders a Leaflet map with ticket density markers
- [ ] Data is fetched from `GET /api/staff/reports/geo-density` with current date range and status filters
- [ ] The map uses circle markers sized by cluster count, or a heatmap layer (Leaflet.heat), to show density
- [ ] The status filter allows toggling between `open`, `closed`, or `all` tickets
- [ ] The density map respects the same date range as the other dashboard charts

**Priority:** P1 | **Feature Ref:** F8

---

### US-8.4: Export Report Data to CSV
**As a** Diane Kowalski, **I want to** download the current filtered report data as a CSV file, **so that** I can share it in a spreadsheet with department managers who don't have system access.

**Acceptance Criteria:**
- [ ] An "Export CSV" button is present on the reports dashboard
- [ ] Clicking it triggers a `GET /api/staff/reports/export?format=csv` request with current date range parameters
- [ ] The browser downloads a file with `Content-Disposition: attachment; filename="ureport-export-{date}.csv"`
- [ ] CSV columns include: `ticket_id`, `reference_id`, `category`, `department`, `status`, `substatus`, `address`, `lat`, `lng`, `created_at`, `updated_at`, `closed_at`, `resolution_hours`, `assignee`
- [ ] Exports are capped at 10,000 rows; if truncated, the response includes `X-Export-Truncated: true` header and a UI notice

**Priority:** P1 | **Feature Ref:** F8

---

## Epic 9: Infrastructure & Platform (F9)

*Kubernetes-native single-pod deployment, health endpoints, database bootstrapping, media storage, structured logging, and PostGIS graceful degradation.*

---

### US-9.1: Deploy and Start the Application as a Single Kubernetes Pod
**As a** Renata Osei, **I want the** application to start reliably as a single pod with a Postgres sidecar and run all database migrations automatically, **so that** deployments and restarts are self-healing with no manual intervention.

**Acceptance Criteria:**
- [ ] `infrastructure.json` in the repo root declares `{ "sidecar_requirements": ["postgres"], "port": 3000 }`
- [ ] The startup entrypoint runs `prisma migrate deploy` before the Next.js server accepts traffic; the command retries with exponential backoff for up to 60 seconds if DB is not yet ready
- [ ] `SEED_ON_BOOT=true` env var triggers the seed script (admin user, sample categories, departments) on startup
- [ ] `prisma migrate deploy` is idempotent — running it on every pod restart does not fail if migrations are already applied
- [ ] The application does not require a Docker daemon at runtime — K8s-native only
- [ ] `next.config.ts` uses the `.ts` extension (not `.js`) as required by Next.js 15+

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.2: Provide Liveness and Readiness Health Endpoints
**As a** Renata Osei, **I want** the pod to expose health check endpoints, **so that** Kubernetes can determine whether the process is alive and whether it is ready to serve traffic after migrations complete.

**Acceptance Criteria:**
- [ ] `GET /api/health/live` returns HTTP 200 with `{ "status": "ok", "timestamp": "<ISO8601>" }` as long as the Node.js process is running; no DB check is performed
- [ ] `GET /api/health/ready` executes a `SELECT 1` DB query and verifies all migrations are applied; returns HTTP 200 with `{ "status": "ready", "db": "connected", "migrations": "applied" }` on success
- [ ] `GET /api/health/ready` returns HTTP 503 with `{ "status": "not_ready", "error": "<reason>" }` if DB is unreachable (`DB_UNAVAILABLE`) or migrations are pending (`MIGRATIONS_PENDING`)
- [ ] The K8s readiness probe is configured against `/api/health/ready` — no traffic is routed until this returns 200
- [ ] Both endpoints are public (no authentication required) and always fast (< 200ms)

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.3: Store and Serve Media Files from Postgres
**As a** Renata Osei, **I want** all uploaded files to be stored in the Postgres database rather than on the pod's local disk, **so that** no media data is lost when the pod restarts.

**Acceptance Criteria:**
- [ ] Files ≤ the `MEDIA_LO_THRESHOLD_KB` threshold (default 8KB) are stored as `bytea` in `Media.data`
- [ ] Files above the threshold are stored via the Postgres Large Object API; `Media.lo_oid` holds the OID
- [ ] `GET /api/media/[id]` streams the file bytes with correct `Content-Type`, `Content-Disposition: inline; filename="{filename}"`, and `Cache-Control: private, max-age=3600` headers
- [ ] Media attached to non-public tickets requires staff or admin session to access; unauthenticated access returns `403 FORBIDDEN`
- [ ] No local filesystem writes occur at any point during upload, storage, or serving
- [ ] If a media record is not found, the endpoint returns `404 NOT_FOUND`

**Priority:** P0 | **Feature Ref:** F9

---

### US-9.4: Run Reliably Without PostGIS and Degrade Gracefully
**As a** Renata Osei, **I want** the application to start and function correctly even if the Postgres sidecar image does not include the PostGIS extension, **so that** a missing extension does not block the entire deployment.

**Acceptance Criteria:**
- [ ] At startup, the app executes `SELECT PostGIS_Version()`; if it succeeds, `GEO_MODE = 'postgis'` is set
- [ ] If the query throws, `GEO_MODE = 'haversine'` is set and an INFO log is written: "PostGIS unavailable — using Haversine fallback"
- [ ] Pod startup does not fail if PostGIS is absent — no uncaught exceptions are thrown during detection
- [ ] All geo distance/proximity queries (staff queue bbox filter, related tickets proximity, reports geo density, Open311 bbox filter) branch on `GEO_MODE` and use Haversine JavaScript math when PostGIS is absent
- [ ] No geo feature errors or broken UI states occur in Haversine mode for normal operations

**Priority:** P0 | **Feature Ref:** F9

---

## Story Index

| Story ID | Title | Persona | Priority | Feature Ref |
|---|---|---|---|---|
| US-0.1 | Drop a Map Pin to Report an Issue Location | Marcus Webb | P0 | F0 |
| US-0.2 | Search an Address to Set the Issue Location | Marcus Webb | P0 | F0 |
| US-0.3 | Select a Category and Submit a Description | Marcus Webb | P0 | F0 |
| US-0.4 | Attach a Photo to a Report | Marcus Webb | P0 | F0 |
| US-0.5 | Submit Anonymously or with Contact Information | Marcus Webb | P0 | F0 |
| US-0.6 | Receive a Confirmation with Ticket ID | Marcus Webb | P0 | F0 |
| US-1.1 | Look Up a Ticket Status by ID | Marcus Webb | P0 | F1 |
| US-1.2 | View a Public Map of All Open Issues | Marcus Webb | P0 | F1 |
| US-1.3 | Share a Direct Link to a Ticket | Marcus Webb | P0 | F1 |
| US-2.1 | Log In with Staff Credentials | Diane Kowalski | P0 | F2 |
| US-2.2 | Access Staff and Admin Routes Securely | Diane Kowalski | P0 | F2 |
| US-2.3 | Change My Own Password | Diane Kowalski | P0 | F2 |
| US-3.1 | View and Filter the Daily Ticket Queue | Diane Kowalski | P0 | F3 |
| US-3.2 | Search Tickets by Keyword or Address | Diane Kowalski | P0 | F3 |
| US-3.3 | Save and Load a Queue Filter Bookmark | Diane Kowalski | P0 | F3 |
| US-3.4 | Bulk-Update Status or Assignee on Multiple Tickets | Diane Kowalski | P0 | F3 |
| US-3.5 | Toggle Map View to Visualize the Queue Geographically | Diane Kowalski | P0 | F3 |
| US-4.1 | View Complete Ticket Information on One Screen | Diane Kowalski | P0 | F4 |
| US-4.2 | Update Ticket Status and Substatus | Diane Kowalski | P0 | F4 |
| US-4.3 | Assign a Ticket to a Staff Member | Diane Kowalski | P0 | F4 |
| US-4.4 | Write an Internal Note or Public Response | Diane Kowalski | P0 | F4 |
| US-4.5 | Insert a Canned Response Template | Diane Kowalski | P0 | F4 |
| US-4.6 | View, Download, and Upload Ticket Media | Diane Kowalski | P0 | F4 |
| US-5.1 | Search for a Constituent Contact Record | Diane Kowalski | P1 | F5 |
| US-5.2 | View a Constituent's Full Ticket History | Diane Kowalski | P1 | F5 |
| US-5.3 | Link or Unlink a Person to a Ticket | Diane Kowalski | P1 | F5 |
| US-5.4 | Merge Duplicate Constituent Records | Diane Kowalski | P1 | F5 |
| US-5.5 | Anonymize a Constituent Record on Request | Renata Osei | P1 | F5 |
| US-6.1 | Manage Service Categories | Renata Osei | P0 | F6 |
| US-6.2 | Manage Departments and Default Assignees | Renata Osei | P0 | F6 |
| US-6.3 | Configure Custom Substatuses | Renata Osei | P0 | F6 |
| US-6.4 | Manage Canned Response Templates | Renata Osei | P0 | F6 |
| US-6.5 | Create and Manage Staff User Accounts | Renata Osei | P0 | F6 |
| US-6.6 | Generate and Revoke Open311 API Keys | Renata Osei | P0 | F6 |
| US-7.1 | Retrieve the List of Active Service Categories | Liam Tran | P0 | F7 |
| US-7.2 | Submit a Service Request via the API | Liam Tran | P0 | F7 |
| US-7.3 | Query and Filter Service Requests | Liam Tran | P0 | F7 |
| US-7.4 | Retrieve a Single Service Request by ID | Liam Tran | P0 | F7 |
| US-8.1 | View Ticket Volume Trends by Category and Department | Diane Kowalski | P1 | F8 |
| US-8.2 | View Open vs. Closed Breakdown and Average Resolution Time | Renata Osei | P1 | F8 |
| US-8.3 | View a Geographic Density Map of Ticket Activity | Diane Kowalski | P1 | F8 |
| US-8.4 | Export Report Data to CSV | Diane Kowalski | P1 | F8 |
| US-9.1 | Deploy and Start the Application as a Single Kubernetes Pod | Renata Osei | P0 | F9 |
| US-9.2 | Provide Liveness and Readiness Health Endpoints | Renata Osei | P0 | F9 |
| US-9.3 | Store and Serve Media Files from Postgres | Renata Osei | P0 | F9 |
| US-9.4 | Run Reliably Without PostGIS and Degrade Gracefully | Renata Osei | P0 | F9 |

---

**Total Stories:** 46  
**P0 Stories:** 37 (across F0, F1, F2, F3, F4, F6, F7, F9)  
**P1 Stories:** 9 (across F5, F8)

---

*Document owner: uReport NG Project Team*  
*Derived from: PRD-uReportNG.md v1.0, FRD-uReportNG.md v1.0, PERSONAS-uReportNG.md v1.0*  
*Downstream consumers: TechArch-uReportNG.md, implementation phases, QA acceptance testing*
