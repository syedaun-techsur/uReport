# Requirements: uReport NG

**Defined:** 2026-07-06
**Core Value:** City constituents can report municipal issues and staff can manage the full ticket lifecycle — all from one responsive, accessible web app running as a single Kubernetes pod with a Postgres sidecar.

## v1 Requirements

### Infrastructure & Platform (F9)

- [ ] **INFRA-01**: System runs as a single Next.js 15 process on port 3000 with no Docker Compose or Docker daemon at runtime
- [ ] **INFRA-02**: DATABASE_URL is read from environment; `prisma migrate deploy` runs natively at boot before `next start`
- [ ] **INFRA-03**: `infrastructure.json` declares `sidecar_requirements: ["postgres"]` for K8s sidecar provisioning
- [ ] **INFRA-04**: `/api/health` endpoint returns liveness status; readiness gated on successful DB ping
- [ ] **INFRA-05**: Media/attachments stored as Postgres bytea — no writes to local filesystem
- [ ] **INFRA-06**: All secrets and URLs (DATABASE_URL, NEXTAUTH_SECRET, etc.) are read from environment variables (12-factor config)
- [ ] **INFRA-07**: App does not emit `X-Frame-Options: DENY/SAMEORIGIN` or `frame-ancestors 'none'/'self'` (Pivota Preview requires iframe embedding)
- [ ] **INFRA-08**: PostGIS extension used for geo queries when available; app degrades gracefully to lat/lng columns if PostGIS is absent

### Database & Data Model (F9 / cross-cutting)

- [ ] **DATA-01**: Prisma schema defines all core entities: Ticket, Person, Category, CategoryGroup, Department, TicketHistory, Action, Response, ResponseTemplate, Media, Substatus, IssueType, Bookmark, Client, AdminAuditLog, plus Auth.js Account/Session tables
- [ ] **DATA-02**: Ticket has `searchVector` tsvector column with GIN index; FTS trigger populates it on insert/update (replaces legacy Solr)
- [ ] **DATA-03**: Ticket has `lat`, `lng` float columns and optional `geom` geometry(Point) for PostGIS spatial queries
- [ ] **DATA-04**: Database seed includes at minimum: default CategoryGroups, sample Categories, one admin user, and one staff user

### Authentication & Sessions (F2)

- [ ] **AUTH-01**: User can log in with email/password via Auth.js credentials provider
- [ ] **AUTH-02**: Session persists across browser refresh; user stays logged in until explicit logout
- [ ] **AUTH-03**: User can log out from any page, clearing their session
- [ ] **AUTH-04**: Role-based access control enforces three roles: `public` (unauthenticated), `staff`, `admin` — middleware gates routes accordingly

### Public Constituent Portal (F0)

- [ ] **PUB-01**: Constituent can pick a service category from a grouped category picker (CategoryGroup → Category hierarchy)
- [ ] **PUB-02**: Constituent can place a map pin (Leaflet + OpenStreetMap) or type an address to set ticket location; address is optional when only lat/lng are provided
- [ ] **PUB-03**: Constituent can enter a description of the issue (free text)
- [ ] **PUB-04**: Constituent can optionally upload a photo; photo stored as Postgres bytea
- [ ] **PUB-05**: Constituent can optionally provide contact information (name, email, phone); submission is allowed anonymously if category permits
- [ ] **PUB-06**: Submitted ticket receives a unique ID shown to constituent; confirmation page provides the tracking URL

### Constituent Issue Tracking (F1)

- [ ] **TRACK-01**: Constituent can look up any ticket by its ID without logging in, and see its current status and substatus
- [ ] **TRACK-02**: A public map page shows all open tickets as clustered markers (Leaflet MarkerCluster); clicking a cluster zooms in; clicking a marker shows ticket summary

### Staff Ticket Queue (F3)

- [ ] **STAFF-01**: Authenticated staff can view a paginated ticket queue filterable by: category, department, status, substatus, date range, and geographic bounding box
- [ ] **STAFF-02**: Staff can perform full-text search across ticket title/description/address using Postgres FTS
- [ ] **STAFF-03**: Staff can sort tickets by created date and updated date (ascending/descending)
- [ ] **STAFF-04**: Staff can save a named filter combination as a Bookmark (saved view) and recall it later
- [ ] **STAFF-05**: Staff can delete their own Bookmarks

### Staff Ticket Detail (F4)

- [ ] **STAFF-06**: Staff can view a ticket's full audit timeline (TicketHistory entries) showing all status changes, assignments, notes, and responses with timestamps and actor names
- [ ] **STAFF-07**: Staff can change a ticket's status (open → closed and valid transitions) and substatus
- [ ] **STAFF-08**: Staff can assign a ticket to a department or specific staff member
- [ ] **STAFF-09**: Staff can post a response to a constituent using free text or a ResponseTemplate; response is recorded in TicketHistory
- [ ] **STAFF-10**: Staff can view all media attachments for a ticket in a gallery; images render inline
- [ ] **STAFF-11**: Ticket detail page shows the ticket's location on a Leaflet map

### Staff CRM / People Management (F5)

- [ ] **CRM-01**: Staff can search for a Person (constituent or staff) by name, email, or phone
- [ ] **CRM-02**: Staff can view a Person's full contact history: all tickets they reported or were linked to
- [ ] **CRM-03**: Staff can link an existing ticket to a Person record
- [ ] **CRM-04**: Staff can create a new Person record and edit contact details (name, email, phone, address, contact method preferences)
- [ ] **CRM-05**: Staff can flag potential duplicate Person records for manual review

### Admin Panel (F6)

- [ ] **ADMIN-01**: Admin can create, edit, and deactivate service Categories; each category has: name, CategoryGroup, default Department, SLA hours, anonymous submission allowed flag, and optional custom fields
- [ ] **ADMIN-02**: Admin can create, edit, and deactivate Departments; departments are linked to categories and staff members
- [ ] **ADMIN-03**: Admin can create, edit, and deactivate Substatuses; each substatus is scoped to a set of ticket statuses
- [ ] **ADMIN-04**: Admin can create, edit, and deactivate ResponseTemplates; templates have a name and body text
- [ ] **ADMIN-05**: Admin can create, deactivate, and assign roles (staff/admin) to user accounts
- [ ] **ADMIN-06**: Admin can create, view, and revoke Open311 API Client keys; keys are stored as SHA-256 hashes; revocation takes effect immediately
- [ ] **ADMIN-07**: All admin configuration changes are recorded in AdminAuditLog with actor, action, target entity, and timestamp; admin can view the audit log
- [ ] **ADMIN-08**: CategoryGroup assignment for categories uses existing seed groups (v1 groups are seed-only; no UI for creating/renaming/deleting CategoryGroups in v1)

### Open311 GeoReport v2 API (F7)

- [ ] **O311-01**: `GET /api/open311/services` returns all active service categories in GeoReport v2 format (JSON and XML via content negotiation)
- [ ] **O311-02**: `GET /api/open311/services/{service_code}` returns service definition including custom fields
- [ ] **O311-03**: `POST /api/open311/requests` accepts a new service request with API-key authentication (`api_key` param); creates a Ticket and returns the `service_request_id`
- [ ] **O311-04**: `GET /api/open311/requests` returns service requests filterable by status, service_code, start_date, end_date, and bbox; pagination metadata in response headers (`X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Has-Next-Page`)
- [ ] **O311-05**: `GET /api/open311/requests/{service_request_id}` returns a single service request by ID
- [ ] **O311-06**: All Open311 responses use exact GeoReport v2 field names (`service_request_id`, `status`, `lat`, `long`, `requested_datetime`, `updated_datetime`, etc.)
- [ ] **O311-07**: XML responses are well-formed and equivalent in content to their JSON counterparts; `Accept: application/xml` or `?format=xml` triggers XML output

### Reports & Metrics Dashboard (F8)

- [ ] **RPT-01**: Authenticated staff/admin can view a dashboard showing ticket volume by category and department over a configurable date range
- [ ] **RPT-02**: Dashboard shows open vs. closed ticket counts and average resolution time (hours) by category/department
- [ ] **RPT-03**: Dashboard includes a geographic heat/cluster view of ticket locations on a Leaflet map
- [ ] **RPT-04**: Dashboard data updates on page load (no real-time streaming required for v1)

## v2 Requirements

### Notifications

- **NOTIF-01**: Email notification to constituent when their ticket status changes
- **NOTIF-02**: In-app notification to staff when a ticket is assigned to them
- **NOTIF-03**: Constituent-configurable notification preferences

### OAuth / External Auth

- **AUTH-V2-01**: OAuth provider support (Google, etc.) for staff login

### CategoryGroup Management

- **ADMIN-V2-01**: Admin UI for creating, renaming, and deleting CategoryGroups (v1 is seed-only)

### Mobile App

- **MOB-01**: Native mobile app (iOS/Android) leveraging the Open311 API — web-first in v1

### Advanced Reporting

- **RPT-V2-01**: Exportable reports (CSV/PDF)
- **RPT-V2-02**: Scheduled report delivery via email
- **RPT-V2-03**: SLA compliance tracking dashboard

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-tenant SaaS / billing / SSO federation | Single municipality instance; out of PRD scope |
| Historical data migration from legacy MySQL/Solr | Greenfield schema + seed data; migration is a separate project |
| Full legacy admin edge-screen parity on day one | Phased — v1 covers core admin operations |
| Docker Compose / Docker daemon at runtime | K8s-native only; Compose would violate sandbox constraints |
| External object store (S3, etc.) for media | Postgres bytea keeps to one-sidecar model for sandbox |
| Real-time push notifications / WebSockets | Not in PRD scope for v1 |
| Multi-language / i18n | Single-language (English) for v1 |
| Priority field on Ticket | Spec validator found no schema backing; deferred to future iteration |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01–08 | Phase 1 | Pending |
| DATA-01–04 | Phase 1 | Pending |
| AUTH-01–04 | Phase 2 | Pending |
| PUB-01–06 | Phase 3 | Pending |
| TRACK-01–02 | Phase 3 | Pending |
| O311-01–07 | Phase 4 | Pending |
| STAFF-01–05 | Phase 5 | Pending |
| STAFF-06–11 | Phase 5 | Pending |
| CRM-01–05 | Phase 6 | Pending |
| ADMIN-01–08 | Phase 6 | Pending |
| RPT-01–04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-06*
*Last updated: 2026-07-06 after initial definition from PRD + spec doc suite*
