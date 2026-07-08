# Roadmap: uReport NG

## Overview

uReport NG is built in seven phases that follow a strict dependency chain: the K8s scaffold and database schema come first, then auth, then the public constituent portal, then the Open311 API, then the staff console, then admin/CRM, and finally reporting. Each phase delivers a complete, independently verifiable capability. By Phase 3 a real constituent can report an issue; by Phase 5 a staff member can fully manage it; by Phase 7 a manager can measure it.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: K8s Scaffold & Data Foundation** - Next.js 15 app running on port 3000, infrastructure.json, health endpoints, complete Prisma schema with FTS/PostGIS, seed data
- [ ] **Phase 2: Authentication & Sessions** - Auth.js credentials login, role-based sessions (public/staff/admin), route guards
- [ ] **Phase 3: Public Portal & Constituent Tracking** - Map-first issue submission, photo upload, confirmation, public ticket lookup, clustered public map
- [ ] **Phase 4: Open311 GeoReport v2 API** - All five endpoints (services + requests), JSON+XML, API-key auth, pagination headers
- [ ] **Phase 5: Staff Ticket Console** - Filterable/searchable queue, saved Bookmarks, ticket detail with history timeline, status changes, responses, media gallery
- [ ] **Phase 6: Admin Panel & CRM** - Full admin back-office (categories, departments, substatuses, templates, users, API keys, audit log), People management with search and merge
- [ ] **Phase 7: Reports & Metrics Dashboard** - Volume charts, open/closed breakdown, avg resolution time, geographic heat/cluster map

## Phase Details

### Phase 1: K8s Scaffold & Data Foundation
**Status**: Complete
**Goal**: The application boots as a single Kubernetes pod, connects to its Postgres sidecar, runs migrations idempotently, and exposes health probes — with the complete Prisma schema (including FTS triggers and PostGIS index) and seed data in place
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08, DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. App starts on port 3000 via a single process; `GET /api/health/live` returns `{ status: "ok" }` and `GET /api/health/ready` returns `{ status: "ready" }` after migrations complete
  2. `infrastructure.json` declares `sidecar_requirements: ["postgres"]`; the app reads `DATABASE_URL` from env and never writes to local filesystem
  3. All Prisma models (Ticket, Person, Category, Department, User, ApiKey, BookmarkedFilter, AdminAuditLog, etc.) are present in the schema and migration runs cleanly against the sidecar
  4. `Ticket.search_vector` tsvector with GIN index and trigger exists; PostGIS geography column and GIST index are created when extension is available; app logs `GEO_MODE` on boot
  5. Seed script produces at least: default CategoryGroups, sample Categories, one admin user, one staff user — DB is queryable after `prisma db seed`
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold (Next.js 15, TypeScript, next.config.ts, infrastructure.json, scripts/migrate-and-start.js, lib/prisma.ts, lib/logger.ts, types/)
- [x] 01-02-PLAN.md — Prisma schema (all 15 models, FTS migration SQL with triggers, PostGIS conditional migration, seed script)
- [x] 01-03-PLAN.md — Health endpoints (/api/health/live + /api/health/ready), PostGIS detection + Haversine fallback (lib/geo.ts), shared API response helpers

### Phase 2: Authentication & Sessions
**Status**: executing
**Goal**: City staff and admins can log in with email/password, have role-enforced sessions that persist across browser refreshes, and be redirected to login when accessing protected routes without a session
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. A seeded staff user can log in at `/login` with valid credentials and land on `/staff/tickets`; invalid credentials show a generic error
  2. A logged-in user's session survives a browser refresh; navigating to `/staff/tickets` without a session redirects to `/login?callbackUrl=...`
  3. A logged-in user can click "Log out" from any page and their session cookie is cleared
  4. A `staff`-role user attempting to access `/admin/**` receives a 403 redirect; an `admin`-role user can access both `/staff/**` and `/admin/**`
**Plans**: 8 plans

Plans:
- [ ] 02-01-PLAN.md — Auth.js v5 credentials provider (lib/auth.ts), Zod schemas, catch-all route handler, login page + Playwright E2E tests (AUTH-01, AUTH-02, AUTH-03)
- [ ] 02-02-PLAN.md — Middleware route guards for /staff/** and /admin/**, requireSession helper, password change API + UI + Playwright E2E tests (AUTH-04)
- [ ] 02-03-PLAN.md — [GAP] Auto-seed on empty DB: unconditional seed when users table is empty (scripts/migrate-and-start.js), fixes UAT Gap 1 (AUTH-01)
- [ ] 02-04-PLAN.md — [GAP] Minimal /staff/tickets placeholder page so middleware can intercept unauthenticated requests (AUTH-01, AUTH-04), fixes UAT Gaps 2 & 3
- [ ] 02-05-PLAN.md — [GAP] Create .env.local with AUTH_SECRET + .env.example; fixes UAT Tests 2, 3, 6 (MissingSecret root cause)
- [ ] 02-06-PLAN.md — [GAP] Minimal staff layout with logout button (app/staff/layout.tsx + LogoutButton.tsx); closes AUTH-03 VERIFICATION gap (SC3)
- [ ] 02-07-PLAN.md — [GAP] Email-OR-username login + SameSite=None cookies; fixes UAT Tests 2, 4, 6 (email lookup + iframe cookie drops)
- [ ] 02-08-PLAN.md — [GAP] Dev server pre-launch migrate+seed (.pivota/start-dev.sh); ensures fresh sandbox has schema+seed before Next.js starts

### Phase 3: Public Portal & Constituent Tracking
**Status**: awaiting verify
**Goal**: Any city resident can report a municipal issue using a map-first form (pin or address, category, description, optional photo and contact), receive a ticket ID, and later look up that ticket's status or view all open issues on a public map — all without logging in
**Depends on**: Phase 1 (data model; Auth not required for public routes)
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, TRACK-01, TRACK-02
**Success Criteria** (what must be TRUE):
  1. A constituent can navigate to `/`, place a pin on the Leaflet map (or type an address), pick a category, enter a description, and submit — the response shows a unique ticket ID and a link to `/tickets/[id]/confirm`
  2. A constituent can optionally attach a photo (stored as Postgres bytea, no filesystem write) and optionally enter contact info; anonymous submission works when the category allows it
  3. A constituent can navigate to `/tickets/[id]` with their ticket ID and see category, status, substatus, creation date, and any public staff responses
  4. A constituent can navigate to `/map` and see all open/in-progress tickets as clustered Leaflet markers; clicking a cluster zooms in; clicking a pin opens a popup with a "View details" link
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Categories API, domain types/Zod schema, ReportingMap (Leaflet+Nominatim), public portal page with grouped category picker + anon logic + E2E tests (PUB-01, PUB-02, PUB-03, PUB-05)
- [ ] 03-02-PLAN.md — POST /api/tickets (multipart+bytea media), lib/media.ts, Person auto-create, GET /api/media/[id], confirmation page + E2E tests (PUB-04, PUB-05, PUB-06)
- [ ] 03-03-PLAN.md — GET /api/tickets/[id]/public (PII-filtered), GET /api/tickets/public-map (GeoJSON), PublicMap (markercluster), ticket detail page, map page + E2E tests (TRACK-01, TRACK-02)

### Phase 4: Open311 GeoReport v2 API
**Goal**: Third-party integrators (mobile apps, 311 aggregators) can use all five GeoReport v2 endpoints over both JSON and XML exactly as they do against the legacy system, with API-key authentication on writes
**Depends on**: Phase 1 (Ticket model, Category model, ApiKey model)
**Requirements**: O311-01, O311-02, O311-03, O311-04, O311-05, O311-06, O311-07
**Success Criteria** (what must be TRUE):
  1. `GET /api/open311/services` returns all active categories in GeoReport v2 format; `GET /api/open311/services/{service_code}` returns the matching service definition including custom fields
  2. `POST /api/open311/requests` with a valid `api_key` creates a Ticket and returns `service_request_id`; a missing or invalid key returns 401
  3. `GET /api/open311/requests` returns filterable, paginated results with `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Has-Next-Page` headers; `GET /api/open311/requests/{id}` returns a single request
  4. All response field names match GeoReport v2 exactly (`service_request_id`, `status`, `lat`, `long`, `requested_datetime`, `updated_datetime`)
  5. Sending `Accept: application/xml` or `?format=xml` returns well-formed XML equivalent in content to the JSON response
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Open311 library layer: `lib/open311.ts` (field mapper, XML serializer, API key verifier), `types/open311.ts`, `schemas/open311.ts`, `lib/rate-limit.ts` + Vitest unit tests
- [ ] 04-02-PLAN.md — All five route handlers: `GET/POST /api/open311/requests`, `GET /api/open311/requests/[id]`, `GET /api/open311/services`, `GET /api/open311/services/[service_code]`

### Phase 5: Staff Ticket Console
**Goal**: Authenticated staff can work the full ticket lifecycle — browse a filterable, searchable, bookmarkable queue; open a ticket detail; change status/substatus; assign to a department or person; post internal notes and public responses using templates; view the history timeline; and manage media attachments
**Depends on**: Phase 2 (auth), Phase 1 (data model)
**Requirements**: STAFF-01, STAFF-02, STAFF-03, STAFF-04, STAFF-05, STAFF-06, STAFF-07, STAFF-08, STAFF-09, STAFF-10, STAFF-11
**Success Criteria** (what must be TRUE):
  1. A logged-in staff user can view a paginated ticket queue and filter it by category, department, status, substatus, date range, and geographic bounding box, or search by free text (FTS)
  2. A staff user can save their current filter combination as a named Bookmark, recall it from a dropdown, and delete it
  3. A staff user can open a ticket and see its complete audit timeline — every status change, assignment, note, and media upload with timestamps and actor names
  4. A staff user can change a ticket's status and substatus, assign it to a department or staff member, and post either an internal note or a public-facing response (using a template or free text) — each action persists a TicketHistory entry
  5. A staff user can view all media attachments for a ticket in a gallery and see the ticket's location on a Leaflet mini-map
**Plans**: TBD

Plans:
- [ ] 05-01: Staff ticket queue page — TicketTable, FilterPanel, FTS search, sort, pagination, bbox filter
- [ ] 05-02: Bookmark CRUD (save/load/delete saved views)
- [ ] 05-03: Ticket detail page — header, MiniMap, HistoryTimeline, status/substatus/assignee controls
- [ ] 05-04: ResponseComposer (internal/public toggle, template picker), MediaGallery (view + upload)

### Phase 6: Admin Panel & CRM
**Goal**: Admins can configure all system reference data (categories, departments, substatuses, response templates, users, API keys) through a back-office UI with a full audit log; staff can search, view, link, and manage constituent Person records
**Depends on**: Phase 2 (auth/admin role), Phase 5 (staff console foundation for Person–Ticket linking)
**Requirements**: CRM-01, CRM-02, CRM-03, CRM-04, CRM-05, ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, ADMIN-08
**Success Criteria** (what must be TRUE):
  1. An admin can create, edit, and deactivate service categories (with CategoryGroup assignment from seed groups), departments, substatuses, and response templates without a code deployment
  2. An admin can create a new staff user account, assign a role, deactivate it, and reset its password — all changes appear in the AdminAuditLog
  3. An admin can generate an Open311 API key (plaintext shown once), assign it a label and scope, and revoke it — revoked keys immediately return 401
  4. A staff user can search for a Person by name, email, or phone; view their full ticket history; link or unlink a ticket; create/edit contact details; and flag potential duplicates for merge
  5. A staff user can merge two Person records (all TicketPerson rows re-pointed to canonical record) and anonymize a Person record on GDPR request
**Plans**: TBD

Plans:
- [ ] 06-01: Admin categories, departments, substatuses, response templates (CRUD + deactivate + audit log)
- [ ] 06-02: Admin user management, API key management, AdminAuditLog viewer
- [ ] 06-03: CRM — Person search, detail, create/edit, link/unlink to ticket, duplicate flag
- [ ] 06-04: CRM — merge persons, anonymize, GDPR workflow

### Phase 7: Reports & Metrics Dashboard
**Goal**: Authenticated staff and admins can view a metrics dashboard showing ticket volume by category and department, open/closed breakdown with average resolution time, and a geographic density map — all over a configurable date range
**Depends on**: Phase 5 (ticket data exists), Phase 2 (auth)
**Requirements**: RPT-01, RPT-02, RPT-03, RPT-04
**Success Criteria** (what must be TRUE):
  1. A logged-in staff or admin user can navigate to `/staff/reports` and see ticket volume charts grouped by category and department over a configurable date range (last 7d, 30d, 90d, custom)
  2. The dashboard shows open vs. closed ticket counts and average resolution time (hours) by category and department
  3. The dashboard includes a Leaflet-based geographic cluster/heat view of ticket locations
  4. Dashboard data reflects the current state of the database on each page load (no stale cache)
**Plans**: TBD

Plans:
- [ ] 07-01: Report API routes (volume-by-category, volume-by-department, status-breakdown, resolution-time, geo-density)
- [ ] 07-02: Reports dashboard page — date range picker, charts (recharts/shadcn), DensityMap component

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. K8s Scaffold & Data Foundation | 3/3 | Complete | 2026-07-07 |
| 2. Authentication & Sessions | 0/2 | Not started | - |
| 3. Public Portal & Constituent Tracking | 0/3 | Not started | - |
| 4. Open311 GeoReport v2 API | 0/2 | Not started | - |
| 5. Staff Ticket Console | 0/4 | Not started | - |
| 6. Admin Panel & CRM | 0/4 | Not started | - |
| 7. Reports & Metrics Dashboard | 0/2 | Not started | - |