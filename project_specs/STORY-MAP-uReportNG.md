# Story Map
## uReport NG — City of Bloomington Municipal 311/CRM

| Field | Value |
|---|---|
| **Product Name** | uReport NG |
| **Project Acronym** | uReportNG |
| **Version** | 1.0 |
| **Date** | 2026-07-06 |
| **Related PRD** | PRD-uReportNG.md |
| **Related Personas** | PERSONAS-uReportNG.md |
| **Related JTBD** | JTBD-uReportNG.md |
| **Related Journeys** | JOURNEYS-uReportNG.md |
| **Related UserStories** | UserStories-uReportNG.md |
| **Status** | Active |

---

## Overview

This story map organizes all 47 user stories across a two-dimensional grid:

- **X-axis (columns):** Journey stages derived from JOURNEYS-uReportNG.md — the "when/where" of user activity
- **Y-axis (rows):** User stories within each stage, grouped by epic and persona
- **NaC column:** Natural Acceptance Criteria — testable criteria derived from JTBD outcomes applied to the journey stage context. Each NaC traces to a specific JTBD outcome and can be cross-checked against the story's acceptance criteria.
- **Release column:** Increment assignment based on P0/P1 priority and journey completeness

**NaC derivation rule:** Every NaC entry takes the form `JTBD-XX.Y → "[journey stage context]" → [testable criterion]`. NaC are not invented — they are derived from the intersection of a JTBD outcome and the journey stage where that outcome is exercised.

**Release strategy:**
- **R1 (MVP):** All P0 stories — completes a full journey end-to-end for all four personas before adding depth
- **R2 (Launch):** All P1 stories — CRM/People depth, analytics/reporting, data export

---

## Story Map Matrix

### PER-01: Marcus Webb (Public Constituent)

| SM-ID | Journey (JRN) | Stage | Epic | Story | NaC | Release |
|---|---|---|---|---|---|---|
| SM-0.1 | JRN-01.1 | 2 · Orient | Epic 0 (F0) | US-0.1: Drop a Map Pin | JTBD-01.1 → Map loads within 3s on 4G; pin placement works without full address → Map renders on mobile with LCP < 2.5s and pin is placeable by touch | R1 |
| SM-0.2 | JRN-01.1 | 3 · Locate | Epic 0 (F0) | US-0.2: Search an Address | JTBD-01.1 → Address entry works as parallel input when pin drop is imprecise → Address autocomplete produces a result within 300ms debounce; Nominatim unavailability does not block submission | R1 |
| SM-0.3 | JRN-01.1 | 4 · Describe | Epic 0 (F0) | US-0.3: Select Category and Submit Description | JTBD-01.1 → Category picker operable without zooming; anonymous mode is obvious → Category list uses min 44px tap targets; "No account needed" label visible; field-level errors shown before POST | R1 |
| SM-0.4 | JRN-01.1 | 4 · Describe | Epic 0 (F0) | US-0.4: Attach a Photo | JTBD-01.1 → Photo from device attached without leaving the flow → File input accepts image/* up to 10MB; media stored in Postgres; photo is optional and does not block submission | R1 |
| SM-0.5 | JRN-01.1 | 4 · Describe | Epic 0 (F0) | US-0.5: Submit Anonymously or with Contact | JTBD-01.1 → Anonymous submission allowed for common categories, no account required → When anon_allowed=true, contact fields are optional; submission proceeds without name/email | R1 |
| SM-0.6 | JRN-01.1 | 5 · Submit & Confirm | Epic 0 (F0) | US-0.6: Receive Confirmation with Ticket ID | JTBD-01.1 → Confirmation appears same screen; ticket ID scannable; entire flow < 2 min → On HTTP 201, confirmation page shows ticket ID prominently with Copy link; >99% submission success rate | R1 |
| SM-1.1 | JRN-01.2 | 2 · Look Up | Epic 1 (F1) | US-1.1: Look Up Ticket Status by ID | JTBD-01.2 → Ticket lookup available at public URL, no login → /tickets/[id] returns status, substatus, last-updated, public notes within 3s without authentication | R1 |
| SM-1.2 | JRN-01.1 | 1 · Discover | Epic 1 (F1) | US-1.2: View Public Map of Open Issues | JTBD-01.3 → Public map shows open clusters; individual popups confirm category/status → Map at /map loads without auth; open+in_progress tickets cluster at low zoom; popup shows category, status, date | R1 |
| SM-1.3 | JRN-01.2 | 4 · Share | Epic 1 (F1) | US-1.3: Share a Direct Link to a Ticket | JTBD-01.2 → Shareable deep-link URL enables return without re-entering ID → /tickets/[id] is stable; deep-link resolves full public status page regardless of how opened | R1 |

### PER-02: Diane Kowalski (City Staff — 311 Coordinator)

| SM-ID | Journey (JRN) | Stage | Epic | Story | NaC | Release |
|---|---|---|---|---|---|---|
| SM-2.1 | JRN-02.1 | 1 · Arrive & Authenticate | Epic 2 (F2) | US-2.1: Log In with Staff Credentials | JTBD-02.1 → Staff session persists across days; no forced re-login on morning open → Valid credentials create signed session cookie; default TTL 8h; on expiry redirect to /login?callbackUrl | R1 |
| SM-2.2 | JRN-02.1 | 1 · Arrive & Authenticate | Epic 2 (F2) | US-2.2: Access Staff and Admin Routes Securely | JTBD-02.1 → Protected routes redirect unauthenticated; roles enforced server-side → /staff/** redirects to login when unauthenticated; staff role blocked from /admin/**; API handlers enforce auth() | R1 |
| SM-2.3 | JRN-02.1 | 1 · Arrive & Authenticate | Epic 2 (F2) | US-2.3: Change My Own Password | JTBD-02.1 → Staff can maintain account security without calling IT → Password change at /staff/account/password; bcrypt hash updated; all other sessions invalidated on success | R1 |
| SM-3.1 | JRN-02.1 | 3 · Scan Queue | Epic 3 (F3) | US-3.1: View and Filter the Daily Ticket Queue | JTBD-02.1 → Queue displays only relevant department's tickets; new-since-last-visit visible → Paginated queue at /staff/tickets with filter panel (category, dept, status, date, bbox); hover popover shows summary | R1 |
| SM-3.2 | JRN-02.2 | 1 · Search | Epic 3 (F3) | US-3.2: Search Tickets by Keyword or Address | JTBD-02.2 → FTS returns results < 500ms p95; handles partial street names → Postgres FTS with GIN index returns results in < 500ms p95; search combinable with all filters | R1 |
| SM-3.3 | JRN-02.1 | 2 · Load Bookmark | Epic 3 (F3) | US-3.3: Save and Load a Queue Filter Bookmark | JTBD-02.1 → Bookmark restores full filter state within 5s; zero re-entry on return visits → BookmarkedFilter persisted server-side; loading restores all filter fields and re-fetches queue; survives session expiry | R1 |
| SM-3.4 | JRN-02.1 | 4 · Prioritize | Epic 3 (F3) | US-3.4: Bulk-Update Status or Assignee | JTBD-02.2 → Bulk close completes in one action on selected tickets; queue reflects update immediately → PATCH /api/staff/tickets/bulk processes up to 100 IDs; each creates TicketHistory entry; response reports count and failures | R1 |
| SM-3.5 | JRN-02.1 | 3 · Scan Queue | Epic 3 (F3) | US-3.5: Toggle Map View to Visualize Queue Geographically | JTBD-02.3 → Staff can visualize where clusters of open issues are concentrated → Map view toggle shows filtered tickets as Leaflet markers; clustering at low zoom; respects all active filters | R1 |
| SM-4.1 | JRN-02.1 | 5 · Drill Into Priority | Epic 4 (F4) | US-4.1: View Complete Ticket Information on One Screen | JTBD-02.2 → Single screen contains all context before action; no navigation away required → Ticket detail at /staff/tickets/[id] shows chronological TicketHistory with distinct icons per action type; related tickets panel | R1 |
| SM-4.2 | JRN-02.2 | 3 · Update Status | Epic 4 (F4) | US-4.2: Update Ticket Status and Substatus | JTBD-02.2 → Status/substatus selector on ticket detail; confirmation dialog; constituent tracking page updated → Status selector shows valid statuses; substatus filtered to current status bucket; TicketHistory row appended | R1 |
| SM-4.3 | JRN-02.2 | 3 · Update Status | Epic 4 (F4) | US-4.3: Assign a Ticket to a Staff Member | JTBD-02.2 → Accountability clear; right person notified from ticket detail without switching tools → Assignee picker typeahead; PATCH /api/staff/tickets/[id] with assignee_id; ASSIGNMENT history entry created | R1 |
| SM-4.4 | JRN-02.2 | 4 · Add Public Note | Epic 4 (F4) | US-4.4: Write an Internal Note or Public Response | JTBD-02.2 → Internal and public notes on same screen; public notes visible on constituent tracking page → Toggle between Internal/Public; is_public=true responses appear on /tickets/[id]; empty body blocked | R1 |
| SM-4.5 | JRN-02.2 | 4 · Add Public Note | Epic 4 (F4) | US-4.5: Insert a Canned Response Template | JTBD-02.2 → Template picker inline; variable placeholder auto-focus; caller stays on hold less → Template picker inserts body into textarea; {{ticket_id}}, {{address}}, {{category_name}} substituted client-side before insertion | R1 |
| SM-4.6 | JRN-02.2 | 3 · Update Status | Epic 4 (F4) | US-4.6: View, Download, and Upload Ticket Media | JTBD-02.2 → Staff can see reported condition and attach work documentation without leaving ticket → Media gallery on detail page; download via GET /api/media/[id]; staff upload creates MEDIA_ADDED history entry | R1 |
| SM-5.1 | JRN-02.2 | 2 · Identify & Open | Epic 5 (F5) | US-5.1: Search for a Constituent Contact Record | JTBD-02.3 → Person searchable by name/email/phone; returns contact history in < 500ms → /staff/people FTS against person_search_vector; result includes linked ticket count and last activity date | R2 |
| SM-5.2 | JRN-02.2 | 2 · Identify & Open | Epic 5 (F5) | US-5.2: View a Constituent's Full Ticket History | JTBD-02.3 → Caller history found in < 30s without ticket ID → Person detail shows all TicketPerson relationships sorted most-recent-first; links to staff ticket detail | R2 |
| SM-5.3 | JRN-02.2 | 2 · Identify & Open | Epic 5 (F5) | US-5.3: Link or Unlink a Person to a Ticket | JTBD-02.3 → Constituent history accurate when someone calls about ticket without original contact info → Link Person modal from ticket detail; creates PERSON_LINKED history entry; unlink of submitter requires admin | R2 |
| SM-5.4 | JRN-02.2 | 2 · Identify & Open | Epic 5 (F5) | US-5.4: Merge Duplicate Constituent Records | JTBD-02.3 → Combined ticket history visible in one place; no duplicate communications → Merge re-points all TicketPerson rows in one transaction; source soft-deleted with merged_into_id; history note appended | R2 |
| SM-5.5 | JRN-03.1 | 4 · Save and Verify | Epic 5 (F5) | US-5.5: Anonymize a Constituent Record on Request | JTBD-03.3 → PII removed on request; audit log entry created; tickets remain intact → Nulls PII fields; sets anonymized_at; PERSON_ANONYMIZED audit entry with actor ID; irreversible | R2 |
| SM-8.1 | JRN-02.1 | 3 · Scan Queue | Epic 8 (F8) | US-8.1: View Ticket Volume Trends | JTBD-02.3 → Reports dashboard shows open ticket count by category and avg resolution time → Volume-by-category and volume-by-department charts with configurable date range (7d/30d/90d/custom) | R2 |
| SM-8.2 | JRN-03.1 | 5 · Confirm Live | Epic 8 (F8) | US-8.2: View Open vs. Closed Breakdown and Avg Resolution Time | JTBD-03.3 → Audit data queryable; service level metrics reportable to city leadership → Donut chart by status; avg resolution time per category/dept; computed from creation to first closed TicketHistory | R2 |
| SM-8.3 | JRN-02.1 | 3 · Scan Queue | Epic 8 (F8) | US-8.3: View Geographic Density Map of Ticket Activity | JTBD-02.3 → Identify problem areas and plan preventive maintenance → Leaflet map with density markers from /api/staff/reports/geo-density; respects date range and status filters | R2 |
| SM-8.4 | JRN-02.1 | 3 · Scan Queue | Epic 8 (F8) | US-8.4: Export Report Data to CSV | JTBD-02.3 → Share report with department managers without system access → GET /api/staff/reports/export?format=csv; Content-Disposition attachment; capped at 10,000 rows with X-Export-Truncated header | R2 |

### PER-03: Renata Osei (City Administrator)

| SM-ID | Journey (JRN) | Stage | Epic | Story | NaC | Release |
|---|---|---|---|---|---|---|
| SM-6.1 | JRN-03.1 | 2 · Create New Category | Epic 6 (F6) | US-6.1: Manage Service Categories | JTBD-03.1 → Category changes appear in public portal immediately; no pod restart → New category created at /admin/categories with service_code, icon, dept, anon_allowed; live in public portal within 60s | R1 |
| SM-6.2 | JRN-03.1 | 2 · Create New Category | Epic 6 (F6) | US-6.2: Manage Departments and Default Assignees | JTBD-03.1 → Department configuration doable through admin UI without developer → /admin/departments create/edit/deactivate; default_assignee_id must reference active staff user | R1 |
| SM-6.3 | JRN-03.1 | 2 · Create New Category | Epic 6 (F6) | US-6.3: Configure Custom Substatuses | JTBD-03.1 → Staff record precise progress states without rigid system; changes take effect immediately → /admin/substatuses grouped by status bucket; drag-to-reorder; deactivated substatuses removed from staff selector | R1 |
| SM-6.4 | JRN-02.2 | 4 · Add Public Note | Epic 6 (F6) | US-6.4: Manage Canned Response Templates | JTBD-03.1 → Staff send consistent accurate communications without typing responses from scratch → /admin/response-templates with {{ticket_id}}, {{address}}, {{category_name}} placeholder support; deactivated templates hidden from picker | R1 |
| SM-6.5 | JRN-03.1 | 1 · Navigate to Admin | Epic 6 (F6) | US-6.5: Create and Manage Staff User Accounts | JTBD-03.1 → New staff account created within 2 minutes; no developer involvement → /admin/users create with role + dept; deactivate blocks login; admin-initiated reset increments token_version invalidating all sessions | R1 |
| SM-6.6 | JRN-03.2 | 2 · Generate New Key | Epic 6 (F6) | US-6.6: Generate and Revoke Open311 API Keys | JTBD-03.2 → Scoped key generated; displayed once; revocation immediate; 401 on next call → /admin/api-keys generates 32-byte hex; stores SHA-256 hash; plaintext shown once; revoked_at causes immediate 401 | R1 |
| SM-6.7 | JRN-03.2 | 4 · Monitor and Audit | Epic 6 (F6) | US-6.7: View the Admin Action Audit Log | JTBD-03.3 → Full audit trail retrieved in < 2 min; admin changes logged with actor and timestamp → /admin/audit-log shows paginated AdminAuditLog; filterable by actor/resource/action/date; append-only; no PII in metadata | R1 |
| SM-9.1 | JRN-03.1 | 1 · Navigate to Admin | Epic 9 (F9) | US-9.1: Deploy as Single Kubernetes Pod | JTBD-03.1 → Deployments and restarts are self-healing; no manual intervention → infrastructure.json with sidecar_requirements: postgres; prisma migrate deploy runs at boot with retry; SEED_ON_BOOT supported | R1 |
| SM-9.2 | JRN-03.1 | 1 · Navigate to Admin | Epic 9 (F9) | US-9.2: Liveness and Readiness Health Endpoints | JTBD-03.1 → K8s determines pod readiness; no traffic until DB and migrations verified → /api/health/live returns 200 always; /api/health/ready checks SELECT 1 and migration state; 503 if not ready | R1 |
| SM-9.3 | JRN-03.1 | 4 · Save and Verify | Epic 9 (F9) | US-9.3: Store and Serve Media Files from Postgres | JTBD-03.1 → No media data lost when pod restarts → Files ≤8KB in bytea; files >8KB via Postgres Large Object; GET /api/media/[id] streams with correct headers; no filesystem writes | R1 |
| SM-9.4 | JRN-03.1 | 1 · Navigate to Admin | Epic 9 (F9) | US-9.4: Run Without PostGIS and Degrade Gracefully | JTBD-03.1 → Missing PostGIS extension does not block deployment → Startup detects PostGIS; sets GEO_MODE=postgis or haversine; no pod startup failure; all geo queries branch on GEO_MODE | R1 |

### PER-04: Liam Tran (Third-Party Integrator)

| SM-ID | Journey (JRN) | Stage | Epic | Story | NaC | Release |
|---|---|---|---|---|---|---|
| SM-7.1 | JRN-04.1 | 1 · Receive Key | Epic 7 (F7) | US-7.1: Retrieve List of Active Service Categories | JTBD-04.1 → Integrator can refresh local service category list when new categories added → GET /api/v2/services returns GeoReport v2 fields (service_code, service_name, group, etc.); JSON default; format=xml returns valid <services> doc | R1 |
| SM-7.2 | JRN-04.1 | 2 · Submit POST Request | Epic 7 (F7) | US-7.2: Submit a Service Request via the API | JTBD-04.1 → POST /api/v2/requests accepts GeoReport v2 fields exactly; service_request_id returned → Requires api_key; missing/invalid key returns 401 with key_not_found; read-scope on POST returns 403; 201 response includes service_request_id | R1 |
| SM-7.3 | JRN-04.2 | 1 · Initiate Sync | Epic 7 (F7) | US-7.3: Query and Filter Service Requests | JTBD-04.2 → GET /api/v2/requests supports page, page_size, status, start_date; < 2s response → Pagination via page/page_size (max 100); X-Total-Count/X-Has-Next-Page response headers; rate limit exceeded returns 429 with Retry-After; GeoReport v2 field names exact; JSON + XML | R1 |
| SM-7.4 | JRN-04.2 | 2 · Receive First Page | Epic 7 (F7) | US-7.4: Retrieve Single Service Request by ID | JTBD-04.1 → GET /api/v2/requests/{id} returns latest status; existing client code unchanged → Returns array with one service_request object; 404 if not found; public no-auth endpoint; format=xml supported | R1 |

---

## NaC Derivation Table

Full traceability chain: JTBD outcome → journey stage → NaC text → story(ies).

| NaC-ID | JTBD-ID | JTBD Outcome | Journey Stage | Natural Acceptance Criterion | Story(ies) |
|---|---|---|---|---|---|
| NaC-01.1a | JTBD-01.1 | Report completed in < 2 min on mobile, no account | JRN-01.1 · 2 Orient | Map loads within 3s on 4G; LCP < 2.5s; pin placeable by touch without address | US-0.1 |
| NaC-01.1b | JTBD-01.1 | Report completed in < 2 min on mobile, no account | JRN-01.1 · 3 Locate | Address autocomplete result within 300ms debounce; Nominatim unavailability does not block submission | US-0.2 |
| NaC-01.1c | JTBD-01.1 | Report completed in < 2 min on mobile, no account | JRN-01.1 · 4 Describe (category) | Category list uses min 44px tap targets; routing department shown below selector; keyboard/SR accessible | US-0.3 |
| NaC-01.1d | JTBD-01.1 | Report completed in < 2 min on mobile, no account | JRN-01.1 · 4 Describe (media) | Photo attachment optional; accepted types image/* and PDF up to 10MB; stored in Postgres; does not block submission | US-0.4 |
| NaC-01.1e | JTBD-01.1 | Anonymous submission allowed per category | JRN-01.1 · 4 Describe (contact) | When anon_allowed=true, contact fields labeled optional; submission proceeds without name/email | US-0.5 |
| NaC-01.1f | JTBD-01.1 | Confirmation appears same screen after submit; ticket ID scannable | JRN-01.1 · 5 Submit & Confirm | On HTTP 201, confirmation page shows ticket ID prominently with Copy link; >99% success rate; failure shows retry option | US-0.6 |
| NaC-01.2a | JTBD-01.2 | Ticket status visible by ID, no login | JRN-01.2 · 2 Look Up | /tickets/[id] returns status, substatus, last-updated date, public notes within 3s; no authentication required | US-1.1 |
| NaC-01.2b | JTBD-01.2 | Shareable deep-link URL enables return without re-entering ID | JRN-01.2 · 4 Share | /tickets/[id] stable URL resolves full public status page regardless of entry path | US-1.3 |
| NaC-01.3a | JTBD-01.3 | Duplicate-check via public map | JRN-01.1 · 1 Discover | Public map loads without auth; open+in_progress tickets cluster below zoom 14; popup shows category, status, date, view-details link | US-1.2 |
| NaC-02.1a | JTBD-02.1 | Staff session persists across days; no forced re-login | JRN-02.1 · 1 Arrive | Valid credentials create signed session cookie (8h TTL); on expiry redirect to /login?callbackUrl; session persists across browser closes | US-2.1 |
| NaC-02.1b | JTBD-02.1 | Protected routes enforce role; no unauthorized access | JRN-02.1 · 1 Arrive | /staff/** redirects unauthenticated to login; staff blocked from /admin/**; API handlers enforce auth() server-side | US-2.2 |
| NaC-02.1c | JTBD-02.1 | Staff maintain account security without calling IT | JRN-02.1 · 1 Arrive | Password change at /staff/account/password; on success all other sessions invalidated (token_version increment) | US-2.3 |
| NaC-02.1d | JTBD-02.1 | Bookmark restores full queue in ≤ 5s; zero re-entry | JRN-02.1 · 2 Load Bookmark | BookmarkedFilter persisted server-side; loading restores all filter fields and re-fetches queue within 5s; survives browser clear | US-3.3 |
| NaC-02.1e | JTBD-02.1 | Queue displays overnight backlog; new tickets visually distinguished | JRN-02.1 · 3 Scan Queue | Paginated queue at /staff/tickets with filter panel; hover popover shows description, photo, contact; sort by created/updated | US-3.1 |
| NaC-02.1f | JTBD-02.1 | Bulk assign completes in one action; queue reflects immediately | JRN-02.1 · 4 Prioritize | Bulk action bar on multi-select; PATCH /api/staff/tickets/bulk up to 100 IDs; queue reflects update without page reload | US-3.4 |
| NaC-02.2a | JTBD-02.2 | FTS returns results < 500ms p95 | JRN-02.2 · 1 Search | Postgres FTS with GIN index; search returns results < 500ms p95; combinable with all filter params | US-3.2 |
| NaC-02.2b | JTBD-02.2 | Ticket found, updated, and closed in ≤ 90s | JRN-02.2 · 3–5 Update/Note/Save | Status/substatus selector; template picker inline; save produces optimistic UI update; entire interaction ≤ 90s without leaving detail screen | US-4.1, US-4.2, US-4.3, US-4.4, US-4.5 |
| NaC-02.2c | JTBD-02.2 | Staff can visualize open cluster geography | JRN-02.1 · 3 Scan Queue | Map view toggle shows filtered tickets as Leaflet markers with clustering; respects all active filters | US-3.5 |
| NaC-02.2d | JTBD-02.2 | Media visible; work documentation attachable without leaving ticket | JRN-02.2 · 3 Update Status | Media gallery on detail page; staff upload creates MEDIA_ADDED history entry; no filesystem writes | US-4.6 |
| NaC-02.3a | JTBD-02.3 | Caller history found in < 30s without ticket ID | JRN-02.2 · 2 Identify & Open | /staff/people FTS on person_search_vector; result includes linked ticket count and last activity date | US-5.1, US-5.2 |
| NaC-02.3b | JTBD-02.3 | Contact record accurate; deduplication workflow available | JRN-02.2 · 2 Identify & Open | Link/unlink person to ticket creates PERSON_LINKED history; merge re-points TicketPerson rows in transaction; source soft-deleted | US-5.3, US-5.4 |
| NaC-02.3c | JTBD-02.3 | Open ticket count by category and avg resolution time visible | JRN-02.1 · 3 Scan Queue | /staff/reports shows volume by category/dept; open vs. closed breakdown; avg resolution time; geo density map; CSV export | US-8.1, US-8.2, US-8.3, US-8.4 |
| NaC-03.1a | JTBD-03.1 | New category live in < 5 min, no code deployment or pod restart | JRN-03.1 · 2–5 Create/Save/Verify | /admin/categories create with service_code, icon, dept, anon_allowed; category appears in public portal within 60s; zero deploy | US-6.1 |
| NaC-03.1b | JTBD-03.1 | Department routing works correctly without developer | JRN-03.1 · 2 Create New Category | /admin/departments create/edit/deactivate; default_assignee_id validated against active staff users | US-6.2 |
| NaC-03.1c | JTBD-03.1 | Precise substatus states configurable by admin; take effect immediately | JRN-03.1 · 2 Create New Category | /admin/substatuses grouped by status bucket; deactivated substatuses removed from staff selector immediately | US-6.3 |
| NaC-03.1d | JTBD-03.1 | Consistent staff communications; no typing from scratch daily | JRN-02.2 · 4 Add Public Note | /admin/response-templates with placeholder token support; deactivated templates hidden from staff picker | US-6.4 |
| NaC-03.1e | JTBD-03.1 | New staff account created within 2 minutes; no developer | JRN-03.1 · 1 Navigate | /admin/users create with role/dept; deactivate blocks login; admin-initiated reset invalidates all sessions | US-6.5 |
| NaC-03.1f | JTBD-03.1 | Platform self-heals on restart; no manual intervention | JRN-03.1 · 1 Navigate | infrastructure.json declares postgres sidecar; prisma migrate deploy idempotent at boot; SEED_ON_BOOT supported | US-9.1 |
| NaC-03.1g | JTBD-03.1 | K8s readiness probe accurate; no traffic before DB ready | JRN-03.1 · 1 Navigate | /api/health/ready verifies DB connectivity + migrations; returns 503 until ready; liveness always fast < 200ms | US-9.2 |
| NaC-03.1h | JTBD-03.1 | No media data lost on pod restart | JRN-03.1 · 4 Save and Verify | Files stored bytea (≤8KB) or Large Object (>8KB); GET /api/media/[id] streams with correct headers; no FS writes | US-9.3 |
| NaC-03.1i | JTBD-03.1 | Missing PostGIS does not block deployment | JRN-03.1 · 1 Navigate | Startup detects PostGIS; sets GEO_MODE; no pod startup failure; all geo queries branch on GEO_MODE | US-9.4 |
| NaC-03.2a | JTBD-03.2 | Scoped key generated; displayed once; revocation immediate | JRN-03.2 · 2 Generate Key | /admin/api-keys generates 32-byte hex; stores SHA-256; plaintext displayed once; revoked_at causes immediate 401 on next call | US-6.6 |
| NaC-03.3a | JTBD-03.3 | Full audit trail retrieved in < 2 min | JRN-03.2 · 4 Monitor | TicketHistory timeline append-only; AdminAuditLog for category/user/API key changes; /admin/audit-log filterable by actor/resource/action/date; append-only DB | US-4.1, US-6.6, US-6.7 |
| NaC-03.3b | JTBD-03.3 | PII removed on request; audit log entry created; tickets intact | JRN-03.1 · 4 Save and Verify | Anonymize nulls PII; sets anonymized_at; PERSON_ANONYMIZED entry with actor+timestamp; irreversible | US-5.5 |
| NaC-03.3c | JTBD-03.3 | Service level metrics reportable to city leadership | JRN-03.1 · 5 Confirm Live | Open vs. closed breakdown; avg resolution time per category/dept; date range configurable; accessible to admin role | US-8.2 |
| NaC-04.1a | JTBD-04.1 | GeoReport v2 field names exact; JSON + XML parse correctly | JRN-04.1 · 2–3 Submit/Parse | POST /api/v2/requests accepts service_code, lat, long, description; returns service_request_id in exact v2 field name; JSON + XML | US-7.2 |
| NaC-04.1b | JTBD-04.1 | GET /api/v2/services keeps local category cache current | JRN-04.1 · 1 Receive Key | GET /api/v2/services returns exact v2 fields; only active categories; JSON default; format=xml valid | US-7.1 |
| NaC-04.1c | JTBD-04.1 | GET /api/v2/requests/{id} returns latest status without full list query | JRN-04.2 · 2 Receive First Page | Returns array with one service_request; 404 if not found; public no-auth; format=xml supported | US-7.4 |
| NaC-04.2a | JTBD-04.2 | Paginated sync completes; no timeouts; no missing records | JRN-04.2 · 1–3 Initiate/Pages | GET /api/v2/requests supports page, page_size (max 100), status, start_date, end_date; response headers X-Total-Count/X-Has-Next-Page/X-Page/X-Page-Size; all pages < 2s; 429 with Retry-After on rate limit | US-7.3 |
| NaC-04.3a | JTBD-04.3 | 401 and 429+Retry-After are distinct from 5xx | JRN-04.1 · 4 Auth Error / JRN-04.2 · 4 Rate Limit | Invalid/revoked key returns 401 with key_not_found body; rate limit returns 429 with Retry-After header; no 5xx confusion | US-7.2, US-7.3 |

---

## Release Planning

### R1 — MVP: "Full Journey for All Personas"
**Theme:** Deliver a complete end-to-end journey for every persona. Constituents can report issues and check status. Staff can triage, search, update, and close tickets. Admin can configure the system without developer help. Integrators keep working without code changes.

**Principle:** Complete all P0 stories — every journey has a start and a finish before any P1 depth is added.

| Epic | Stories | Count | Personas Served |
|---|---|---|---|
| F0 Public Portal | US-0.1–0.6 | 6 | PER-01 |
| F1 Issue Tracking | US-1.1–1.3 | 3 | PER-01 |
| F2 Auth & Sessions | US-2.1–2.3 | 3 | PER-02, PER-03 |
| F3 Staff Queue | US-3.1–3.5 | 5 | PER-02 |
| F4 Ticket Detail | US-4.1–4.6 | 6 | PER-02 |
| F6 Admin Panel | US-6.1–6.7 | 7 | PER-03 |
| F7 Open311 API | US-7.1–7.4 | 4 | PER-04 |
| F9 Infrastructure | US-9.1–9.4 | 4 | PER-03 (Ops) |
| **R1 Total** | | **38** | **All 4 personas** |

**JTBD addressed in R1:** JTBD-01.1, JTBD-01.2, JTBD-02.1, JTBD-02.2, JTBD-03.1, JTBD-03.2, **JTBD-03.3** (partial — admin audit log; ticket timeline ships R1; F5 anonymize/F8 metrics complete in R2), JTBD-04.1, JTBD-04.2, JTBD-04.3

**R1 enables these complete journeys:**
- JRN-01.1 (Marcus reports a pothole) — US-0.1→0.6 complete
- JRN-01.2 (Marcus checks ticket status) — US-1.1, US-1.3 complete
- JRN-02.1 (Diane morning queue triage) — US-2.1, US-3.1, US-3.3, US-3.4, US-4.1 complete
- JRN-02.2 (Diane finds, updates, closes a ticket) — US-3.2, US-4.2–4.5 complete
- JRN-03.1 (Renata creates a new category) — US-6.1, US-6.2, US-6.5, US-9.1 complete
- JRN-03.2 (Renata issues and revokes an API key; reviews audit log) — US-6.6, US-6.7 complete
- JRN-04.1 (Liam POSTs a service request) — US-7.2 complete
- JRN-04.2 (Liam paginated nightly sync) — US-7.3 complete

---

### R2 — Launch: "Depth and Insights"
**Theme:** Add constituent CRM depth, analytics, and operational visibility. Staff can now surface caller history instantly, spot trends, and export data. Admin can audit and anonymize PII on request.

**Principle:** Complete all P1 stories — every journey stage that was left shallow in R1 gets a full implementation.

| Epic | Stories | Count | Personas Served |
|---|---|---|---|
| F5 CRM / People | US-5.1–5.5 | 5 | PER-02, PER-03 |
| F8 Reports & Metrics | US-8.1–8.4 | 4 | PER-02, PER-03 |
| **R2 Total** | | **9** | **PER-02, PER-03** |

**JTBD addressed in R2 (new):** JTBD-01.3 (public map depth), JTBD-02.3 (workload insight + caller history), JTBD-03.3 (audit trail + compliance)

**R2 enables these complete journeys:**
- JRN-01.2 Stage 1 (Marcus returns via shareable URL — enhanced by US-1.2 public map awareness)
- JTBD-02.3 journey (Diane pulls caller history and team workload metrics) — US-5.1–5.4, US-8.1–8.4 complete
- JTBD-03.3 audit journey (Renata reviews escalation audit trail) — US-5.5, US-8.2 contribute

---

## Coverage Analysis

### Persona Coverage by Release

| Persona | R1 (MVP) | R2 (Launch) |
|---|---|---|
| PER-01 Marcus (Constituent) | ✅ Full reporting + status lookup journey | US-1.2 gains public map depth (US-1.2 already in R1; richer context from R2 metrics) |
| PER-02 Diane (Staff) | ✅ Full queue triage + ticket update journey | ✅ Caller history (F5) + analytics (F8) complete |
| PER-03 Renata (Admin) | ✅ Full category/dept/user/API key management | ✅ Audit/compliance (F5 anonymize + F8 metrics) |
| PER-04 Liam (Integrator) | ✅ Full Open311 API surface — all 4 endpoints | No additional stories; fully served in R1 |

### JTBD Coverage by Release

| JTBD-ID | R1 | R2 |
|---|---|---|
| JTBD-01.1 | ✅ US-0.1–0.6 | — |
| JTBD-01.2 | ✅ US-1.1, US-1.3 | — |
| JTBD-01.3 | ✅ US-1.2 (public map) | — |
| JTBD-02.1 | ✅ US-2.1–2.3, US-3.1, US-3.3, US-3.4 | — |
| JTBD-02.2 | ✅ US-3.2, US-3.4, US-4.1–4.6 | — |
| JTBD-02.3 | ⚠️ Partial (US-3.5 geo queue view) | ✅ US-5.1–5.4, US-8.1–8.4 complete |
| JTBD-03.1 | ✅ US-6.1–6.5, US-9.1–9.4 | — |
| JTBD-03.2 | ✅ US-6.6 | — |
| JTBD-03.3 | ⚠️ Partial (US-4.1 history timeline + US-6.7 admin audit log) | ✅ US-5.5, US-8.2 complete compliance/reporting depth |
| JTBD-04.1 | ✅ US-7.1, US-7.2, US-7.4 | — |
| JTBD-04.2 | ✅ US-7.3 | — |
| JTBD-04.3 | ✅ US-7.2, US-7.3 (401/429 signals) | — |

### Gap Analysis

**Journey stages with no mapped stories:**
- JRN-01.2 Stage 1 (Return via shareable URL): covered implicitly by US-1.3 (stable /tickets/[id] URL) — no dedicated story gap; intent is fully addressed.
- JRN-03.2 Stage 3 (Share key via secure channel): explicitly external (out of product scope for v1). No story needed.

**JTBD outcomes partially deferred to R2:**
- JTBD-02.3 (caller history, workload metrics): US-3.5 provides geo queue view in R1; full caller history (F5) and analytics (F8) complete in R2. Staff CRM search is the highest-priority R2 dependency for Diane's morning workflow.
- JTBD-03.3 (audit trail depth): ticket timeline history (US-4.1) ships in R1; admin action log and PII audit path (US-5.5, US-8.2) complete in R2.

**Orphan stories (no journey stage mapping):**
- None. All 46 stories are mapped to at least one journey stage in the matrix above.

**Stories without NaC:**
- None. Every story has at least one NaC derived from a JTBD outcome.

**JTBD outcomes with no story coverage:**
- None. All 12 JTBD outcomes are addressed by at least one story.

---

## NaC-to-Acceptance Criteria Alignment

Verification that NaC align with story acceptance criteria.

| NaC-ID | NaC Statement (abbreviated) | Story | Acceptance Criteria Alignment |
|---|---|---|---|
| NaC-01.1a | Map loads < 3s on 4G; LCP < 2.5s | US-0.1 | ✅ AC: "Map renders correctly on mobile browsers"; LCP NFR stated in PRD |
| NaC-01.1b | Address autocomplete < 300ms debounce | US-0.2 | ✅ AC: "debounced (300ms) query to Nominatim"; graceful fallback if unavailable |
| NaC-01.1c | 44px tap targets; routing dept visible; keyboard/SR | US-0.3 | ✅ AC: "keyboard and screen reader (ARIA labels, visible focus states)"; dept shown below selector |
| NaC-01.1d | Photo optional; ≤10MB; stored in Postgres | US-0.4 | ✅ AC: "Stored in Postgres (bytea / Large Object)"; optional; 10MB cap |
| NaC-01.1e | anon_allowed=true → contact optional | US-0.5 | ✅ AC: "When anon_allowed = true, contact fields...labeled Optional" |
| NaC-01.1f | 201 → confirmation page; ticket ID; >99% success | US-0.6 | ✅ AC: "On successful POST /api/tickets (HTTP 201), client navigates to /tickets/[id]/confirm"; "Submission success rate is target >99%" |
| NaC-01.2a | /tickets/[id] public; status+substatus+notes in < 3s | US-1.1 | ✅ AC: "without requiring login"; status, substatus public label, last-updated, public notes displayed |
| NaC-01.2b | /tickets/[id] stable; deep-link resolves full page | US-1.3 | ✅ AC: "stable URL of the form /tickets/[id]"; "Deep-link URLs resolve correctly" |
| NaC-01.3a | Public map; open+in_progress clustered; popup details | US-1.2 | ✅ AC: "without authentication"; "status IN (open, in_progress) as markers"; cluster + popup with category, status, address |
| NaC-02.1a | Session cookie 8h TTL; redirect on expiry | US-2.1 | ✅ AC: "Default session TTL is 8 hours"; "On session expiry, redirected to /login?callbackUrl" |
| NaC-02.1b | /staff/** redirects; staff blocked from /admin/** | US-2.2 | ✅ AC: "All routes under /staff/** redirect unauthenticated"; "staff role...receives a 403" on /admin/** |
| NaC-02.1c | Password change; all sessions invalidated | US-2.3 | ✅ AC: "all other active sessions...are invalidated (token version incremented)" |
| NaC-02.1d | Bookmark restores all filters; survives session expiry | US-3.3 | ✅ AC: "Loading a bookmark restores all filter fields"; "Bookmarks are persisted server-side and survive...session expiry" |
| NaC-02.1e | Queue with filter panel; hover popover | US-3.1 | ✅ AC: filter panel with category/dept/status/date/bbox; "quick-view popover appears on row hover" |
| NaC-02.1f | Bulk action up to 100 IDs; queue reflects immediately | US-3.4 | ✅ AC: "PATCH /api/staff/tickets/bulk with up to 100 ticket IDs"; history entry per ticket |
| NaC-02.2a | FTS < 500ms p95 | US-3.2 | ✅ AC: "FTS query results are returned in under 500ms at p95" |
| NaC-02.2b | Single-screen update in ≤ 90s | US-4.2, US-4.4, US-4.5 | ✅ AC: status selector no nav away (US-4.2); template inserts into textarea (US-4.5); no nav for notes (US-4.4) |
| NaC-02.2c | Map view respects all active filters | US-3.5 | ✅ AC: "Map view respects all active filters" |
| NaC-02.2d | Media gallery; staff upload creates MEDIA_ADDED | US-4.6 | ✅ AC: "Each upload creates a TicketHistory row with action = MEDIA_ADDED"; no FS writes |
| NaC-02.3a | People FTS; result includes ticket count + last activity | US-5.1 | ✅ AC: "FTS against the person_search_vector"; "linked ticket count, and last activity date" |
| NaC-02.3b | Link/unlink history entry; merge in transaction | US-5.3, US-5.4 | ✅ AC: PERSON_LINKED history (US-5.3); "re-points all TicketPerson rows...in a single Prisma transaction" (US-5.4) |
| NaC-02.3c | Reports: volume, resolution, geo, CSV export | US-8.1–8.4 | ✅ AC: each story covers its chart type with date range picker; CSV cap at 10,000 rows |
| NaC-03.1a | Category live in < 60s; no pod restart | US-6.1 | ✅ AC: "Changes take effect immediately in the live system — no pod restart required" |
| NaC-03.1e | Account active within 2 min; no developer | US-6.5 | ✅ AC: "New accounts are active immediately upon creation"; admin-initiated reset invalidates sessions |
| NaC-03.1f | prisma migrate deploy idempotent at boot | US-9.1 | ✅ AC: "prisma migrate deploy before the Next.js server accepts traffic"; idempotent |
| NaC-03.1g | /api/health/ready checks DB + migrations; 503 until ready | US-9.2 | ✅ AC: SELECT 1 + migration check; "HTTP 503" if not ready |
| NaC-03.1h | Bytea/LO storage; no FS writes | US-9.3 | ✅ AC: "No local filesystem writes occur at any point" |
| NaC-03.1i | GEO_MODE set at startup; no pod failure | US-9.4 | ✅ AC: "Pod startup does not fail if PostGIS is absent" |
| NaC-03.2a | 32-byte key; SHA-256 stored; 401 immediate on revoke | US-6.6 | ✅ AC: "32-byte random hex key, stores only its SHA-256 hash"; "revoked keys return HTTP 401 on any subsequent use" |
| NaC-03.3a | TicketHistory append-only; admin action logged | US-4.1, US-6.6 | ✅ AC: chronological TicketHistory (US-4.1); "last-used timestamp" + revoke action logged (US-6.6) |
| NaC-03.3b | Anonymize nulls PII; PERSON_ANONYMIZED entry | US-5.5 | ✅ AC: "server nulls name, email, phone, and notes"; "An audit log entry is created: action = PERSON_ANONYMIZED" |
| NaC-04.1a | POST v2 fields exact; service_request_id returned | US-7.2 | ✅ AC: "Open311 field long (not lng)"; "service_request_id, service_code, status, requested_datetime" in 201 response |
| NaC-04.1b | GET /services returns exact v2 fields; JSON + XML | US-7.1 | ✅ AC: "exactly the GeoReport v2 fields: service_code, service_name, description, metadata, type, keywords, group" |
| NaC-04.1c | GET /requests/{id} array-wrapped; 404 if not found | US-7.4 | ✅ AC: "array with one service_request object (as per Open311 spec)"; "HTTP 404" if not found |
| NaC-04.2a | Pagination page/page_size/status/dates; < 2s; 429+Retry-After; X-Total-Count/X-Has-Next-Page headers | US-7.3 | ✅ AC: page+page_size max 100; X-Total-Count/X-Has-Next-Page response headers; "Rate limit exceeded returns HTTP 429 with Retry-After header" |
| NaC-04.3a | 401 distinct from 429+Retry-After distinct from 5xx | US-7.2, US-7.3 | ✅ AC: 401 with key_not_found body (US-7.2); 429 with Retry-After (US-7.3); no code conflation |

---

*Document owner: uReport NG Project Team*
*Derived from: PERSONAS-uReportNG.md, JTBD-uReportNG.md, JOURNEYS-uReportNG.md, UserStories-uReportNG.md, PRD-uReportNG.md*
*Downstream consumers: FRD-uReportNG.md, TechArch-uReportNG.md, increment planning, QA acceptance testing*
