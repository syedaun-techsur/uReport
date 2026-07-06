# Product Requirements Document
## uReport NG — City of Bloomington Municipal 311/CRM

**Project Acronym:** uReportNG  
**Version:** 1.0  
**Date:** 2026-07-06  
**Status:** Active  

---

## 1. Executive Summary

uReport NG is a modern full-stack rebuild of the City of Bloomington's municipal 311/CRM system as a single-deployable Next.js 15 web application. It enables city constituents to report local issues via a map-first interface while giving city staff and administrators tools to manage, track, and resolve those reports — all while preserving full Open311 GeoReport v2 API compatibility for existing third-party integrations. The application runs as a single Kubernetes pod with a Postgres sidecar, eliminating operational complexity without sacrificing functionality.

---

## 2. Problem Statement

The City of Bloomington's existing uReport system is built on a legacy PHP MVC stack backed by MySQL/MariaDB and a separate Solr search service. This architecture has accumulated significant operational and maintainability debt:

**Operational challenges:**
- Multi-process deployment (PHP app + Solr) increases infrastructure complexity and failure surface
- No native Kubernetes compatibility — legacy system does not map to a single-pod model
- Solr as a second stateful dependency requires separate provisioning, upgrades, and backup
- Media files stored on ephemeral local filesystem risk data loss in container restarts

**Product challenges:**
- No responsive mobile-first interface for constituents reporting issues in the field
- Accessibility does not meet WCAG 2.1 AA standards required for municipal services
- Staff ticket management lacks full-text search, saved views, and modern workflow tools
- No built-in dark mode or modern design system — costly to maintain UI updates
- CRM/People module is rudimentary — staff cannot reliably track constituent history

**Integration challenges:**
- Third-party integrators (mobile apps, 311 aggregators) depend on Open311 GeoReport v2 semantics that must be preserved exactly during any migration
- No API key management for external clients

---

## 3. Product Vision

**Vision Statement:** Deliver a modern, accessible, single-pod municipal 311 platform that any city staff member can use on day one — constituents report issues on a map, staff resolve them efficiently, and third-party integrations keep working without change.

**Strategic Goals:**
- Replace a fragile multi-service legacy stack with one deployable Next.js process that runs cleanly on Kubernetes
- Preserve 100% backward-compatible Open311 GeoReport v2 API surface so existing integrations require zero changes
- Provide a WCAG 2.1 AA-compliant, responsive, map-first interface for constituents and staff alike
- Eliminate Solr by replacing full-text search with native Postgres FTS (tsvector + GIN indexes)
- Eliminate ephemeral filesystem dependencies by storing media in Postgres (bytea/large object)
- Establish a clean, maintainable TypeScript codebase using current Next.js 15 / React 19 idioms as the foundation for future city development

---

## 4. Technical Architecture

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 + TypeScript | Single process, port 3000 |
| **Database** | PostgreSQL 16 (sidecar) via `DATABASE_URL` | No bundled DB; migrations at boot |
| **ORM** | Prisma ORM | `prisma migrate deploy` at pod start |
| **Search** | Postgres FTS — tsvector + GIN indexes | Replaces legacy Solr |
| **Geo** | PostGIS extension (enhancement) | Graceful fallback to lat/lng + app math |
| **Auth** | Auth.js — credentials provider | Roles: `public` / `staff` / `admin` |
| **UI** | shadcn/ui + Tailwind CSS + lucide icons | Light/dark with system default |
| **Maps** | Leaflet + react-leaflet + OpenStreetMap tiles | No proprietary API key required |
| **Media** | Postgres bytea / large object | No local filesystem writes |
| **Config** | 12-factor — all secrets from env vars | `DATABASE_URL`, `AUTH_SECRET`, etc. |
| **Testing** | Vitest (unit) + Playwright (e2e) | No Docker daemon in CI |
| **Deployment** | Single K8s pod, port 3000 | `infrastructure.json` sidecar_requirements: postgres |

**Key Architecture Decisions:**
- Full-stack Next.js 15 (single process) was chosen over a split NestJS API + Next.js frontend because one process/one port maps cleanly to the single-pod K8s sandbox model
- `next.config.ts` extension required (not `.js`) with Next.js 15+
- CSP/framing: must not emit `X-Frame-Options: DENY/SAMEORIGIN` or `frame-ancestors 'none'` — Pivota Preview embeds the app in an iframe

---

## 5. Feature Requirements

### F0: Public Constituent Portal
**Description:** The primary entry point for city residents to report municipal issues. Provides a map-first reporting flow where constituents drop a pin or type an address, choose a category, write a description, and optionally attach a photo and contact information. Anonymous submissions are supported per category configuration.

**Capabilities:**
- Map-first issue reporting with Leaflet + OpenStreetMap (drop pin or address search)
- Category selection with department routing visible to constituent
- Free-text description field
- Optional photo/media upload (stored in Postgres — no filesystem)
- Optional contact information (name, email, phone); anonymous mode per category setting
- Confirmation page with generated ticket ID for tracking
- Responsive layout — usable on mobile browsers in the field
- WCAG 2.1 AA throughout: keyboard navigation, ARIA labels, focus management

**Priority:** P0 — Critical, MVP requirement

---

### F1: Constituent Issue Tracking
**Description:** Allows any constituent to look up the status of a previously submitted ticket by ID and view a public map of all currently open issues across the city.

**Capabilities:**
- Ticket lookup by ID — displays category, status, substatus, creation date, last-updated date, and any public staff notes
- Public issue map showing all open/active tickets clustered by proximity (Leaflet marker clustering)
- Cluster expansion on zoom; individual ticket popup with summary
- No login required for public lookup or map view
- Shareable ticket URL (deep link by ID)

**Priority:** P0 — Critical, MVP requirement

---

### F2: Authentication & Role-Based Sessions
**Description:** Credential-based authentication managed through Auth.js. Three roles govern access: `public` (unauthenticated constituents), `staff` (city employees managing tickets), and `admin` (system administrators). Sessions are server-managed with JWT or database-backed tokens.

**Capabilities:**
- Login page with username/password credentials (no OAuth/social login)
- Role enforcement via Auth.js middleware on all protected routes and API endpoints
- Session expiry and secure cookie handling
- Password change flow for staff/admin accounts
- Route-level guard: staff routes (`/staff/**`) and admin routes (`/admin/**`) redirect unauthenticated users to login
- No public self-registration — accounts created by admins only

**Priority:** P0 — Critical, MVP requirement

---

### F3: Staff Ticket Queue
**Description:** The primary staff workspace for managing the incoming stream of constituent reports. Provides a filterable, searchable list view with saved filters (Bookmarks) and batch actions.

**Capabilities:**
- Paginated ticket list with configurable columns (ID, category, department, status, substatus, assignee, date)
- Filter panel: category, department, status/substatus, assignee, date range, geographic bounding box
- Full-text search across ticket title, description, and address using Postgres FTS (tsvector + GIN)
- Saved filter views ("Bookmarks") per staff user — persisted in database
- Bulk status update and bulk assignment on selected tickets
- Sort by created, updated, priority
- Quick-view popover on row hover; click-through to full ticket detail
- Map view toggle — visualize filtered queue tickets on Leaflet map

**Priority:** P0 — Critical, MVP requirement

---

### F4: Staff Ticket Detail
**Description:** Full detail view for a single ticket, serving as the primary workspace for staff to investigate, update, respond to, and close constituent reports.

**Capabilities:**
- Ticket header: ID, category, department, address, map pin (Leaflet mini-map)
- Status/substatus selector with save confirmation
- Assignee picker (staff user search)
- History timeline: chronological log of all status changes, assignments, comments, and media additions with timestamps and actor names
- Internal staff notes (not visible to public) and public-facing response notes
- Templated response insertion — pull from saved response templates
- Media gallery: view, download, and add photos/attachments stored in Postgres
- Linked constituent (Person) display with link to CRM record
- Related tickets panel (same address or same constituent)

**Priority:** P0 — Critical, MVP requirement

---

### F5: Staff CRM / People Management
**Description:** A lightweight constituent relationship management module that allows staff to link tickets to known individuals, de-duplicate contacts, and view the full history of a constituent's interactions with the city.

**Capabilities:**
- Person record: name, email, phone, notes, preferred contact method
- Automatic constituent linking when a ticket is submitted with contact info
- Manual link/unlink of a Person to/from a Ticket
- De-duplication workflow: flag potential duplicate person records, merge with audit trail
- Contact history view: all tickets ever submitted by or linked to a Person
- Staff search across People (name, email, phone) using Postgres FTS
- GDPR-light: ability to anonymize a Person record on request

**Priority:** P1 — High, required for launch

---

### F6: Admin Panel
**Description:** The configuration back-office for system administrators. Provides management screens for all reference data and system configuration objects — none of which require code deployments to change.

**Capabilities:**

**Category management:**
- Create, edit, deactivate service categories
- Set category display name, description, icon/color, linked department
- Configure per-category anonymity allowed / contact required setting
- Set Open311 service_code mapping

**Department management:**
- Create, edit, deactivate departments
- Assign default staff assignee per department

**Substatus management:**
- Create, edit, order custom substatuses per status (Open, In Progress, Closed, etc.)
- Set public-visible label vs. internal label

**Response template management:**
- Create, edit, deactivate canned response templates
- Organize by category or department
- Support variable placeholders (e.g., `{{ticket_id}}`, `{{address}}`)

**User / role management:**
- Create staff and admin accounts (username, email, role, department)
- Deactivate / reactivate accounts
- Reset password (admin-initiated)

**Open311 API key management:**
- Generate, label, and revoke API keys for third-party integrators
- Per-key scope (read-only vs. write)
- Last-used timestamp display

**Priority:** P0 — Critical, MVP requirement (without category/dept/user management the system cannot operate)

---

### F7: Open311 GeoReport v2 API
**Description:** A fully compatible implementation of the Open311 GeoReport v2 specification exposed at standard paths. This API surface must remain backward-compatible so existing third-party integrators (mobile apps, 311 aggregators) require zero changes.

**Endpoints:**
- `GET /api/v2/services` — list all active service categories
- `GET /api/v2/services/{service_code}` — service definition with attribute schema
- `POST /api/v2/requests` — submit a new service request (API-key authenticated for writes)
- `GET /api/v2/requests` — query service requests (filterable by status, service_code, dates, bbox)
- `GET /api/v2/requests/{service_request_id}` — single request detail

**Compliance requirements:**
- JSON response format (default) and XML response format (via `format=xml` or `Accept: application/xml`)
- Field names match GeoReport v2 specification exactly (e.g., `service_request_id`, `status`, `service_code`, `lat`, `long`, `requested_datetime`)
- API-key authentication on POST (key passed as `api_key` query param or header)
- Rate limiting on public GET endpoints (configurable via env var)
- Pagination via `page_size` and `page` parameters

**Priority:** P0 — Critical, must not regress existing integrations

---

### F8: Reports & Metrics Dashboard
**Description:** An analytics dashboard for staff and administrators to understand service request trends, workload distribution, and resolution performance over time.

**Capabilities:**
- Volume by category — bar/line chart of ticket submissions over a configurable date range
- Volume by department — same, grouped by assigned department
- Open vs. closed breakdown — donut chart with drill-down by status
- Average resolution time — median and mean close time per category and department
- Geographic heat/cluster view — Leaflet-based map of ticket density by area
- Date range picker (last 7d, 30d, 90d, custom)
- CSV export of filtered results
- Dashboard accessible to staff and admin roles only

**Priority:** P1 — High, required for launch

---

### F9: Infrastructure & Platform
**Description:** The deployment, operations, and developer-experience foundation that makes the application run reliably as a single Kubernetes pod on the Pivota sandbox platform.

**Capabilities:**

**Kubernetes-native deployment:**
- Single Next.js process on port 3000
- `infrastructure.json` declares `sidecar_requirements: ["postgres"]`
- `PIVOTA_DB_MODE=sidecar-postgres` env var support
- No Docker daemon dependency at runtime

**Database bootstrapping:**
- `prisma migrate deploy` runs idempotently at pod startup before server accepts traffic
- Seed data script for initial admin user, sample categories, and departments

**Health endpoints:**
- `GET /api/health/live` — liveness probe (process alive)
- `GET /api/health/ready` — readiness probe (DB connected, migrations applied)

**12-factor configuration:**
- All secrets and connection strings from environment variables: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `OPEN311_RATE_LIMIT`, etc.
- No secrets baked into container image

**Media storage:**
- All file uploads stored as Postgres bytea / large object
- Served via Next.js API route (`GET /api/media/[id]`) with proper MIME headers
- No writes to local filesystem (ephemeral pod disk)

**Observability:**
- Structured JSON request logging (Next.js middleware)
- Error boundary logging with stack trace capture

**PostGIS graceful degradation:**
- Geo queries use PostGIS ST_Distance / ST_DWithin when extension is available
- Automatic detection at startup; fallback to Haversine app-level math when PostGIS is absent
- No startup failure if PostGIS is missing

**Priority:** P0 — Critical, required for any deployment

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Ticket list page initial load < 2s on 4G mobile; map tile rendering non-blocking |
| **Performance** | Postgres FTS query response < 500ms for typical staff search |
| **Accessibility** | WCAG 2.1 AA throughout — keyboard navigation, focus states, ARIA on map and list components |
| **Accessibility** | Color contrast ratio ≥ 4.5:1 for all text; skip-to-content link on every page |
| **Security** | All staff/admin routes protected by Auth.js middleware — no unauthorized access |
| **Security** | Open311 POST endpoints require valid API key — 401 on missing/invalid key |
| **Security** | No `X-Frame-Options: DENY/SAMEORIGIN` — Pivota Preview embeds app in iframe |
| **Security** | SQL injection protection via Prisma parameterized queries only |
| **Reliability** | Readiness probe blocks traffic until DB connection and migrations verified |
| **Reliability** | `prisma migrate deploy` is idempotent — safe to run on every pod restart |
| **Scalability** | Single-pod model — no shared in-memory state; all state in Postgres |
| **Browser support** | Last 2 versions of Chrome, Firefox, Safari, Edge; iOS Safari 16+; Android Chrome |
| **Internationalization** | English only for v1; date/time displayed in city-local timezone (configurable via env) |
| **Config** | All environment values from `process.env`; no `.env` committed to repo |
| **Testing** | Unit tests (Vitest) cover data-layer utilities and API handlers; Playwright e2e covers critical constituent and staff flows |
| **Testing** | No `testcontainers` or `docker run` in test suite — tests run against existing sidecar DB or mocks |

---

## 7. Success Metrics

**Adoption:**
- 100% of active Open311 integrations continue to function after cutover (zero regression)
- Staff ticket queue adoption: > 90% of staff using new system within 30 days of launch

**Performance:**
- Public portal page load (LCP) < 2.5s on simulated 4G
- Ticket submission success rate > 99% (no data loss on submission)
- Staff FTS query p95 latency < 500ms

**Reliability:**
- Pod restart recovery time (boot → readiness) < 30 seconds including migrations
- Zero media data loss events (Postgres storage replaces ephemeral FS)
- Uptime SLA target: 99.5% measured monthly

**Quality:**
- Lighthouse Accessibility score ≥ 90 on public portal and staff queue
- Zero P0 open-accessibility bugs at launch (automated axe-core scan in Playwright e2e)
- Test coverage: ≥ 80% line coverage on server-side data utilities

**Operational:**
- Admin can add a new service category without a code deployment
- Admin can create, revoke, and audit an Open311 API key via UI
- Staff can save and share a ticket queue filter without engineering involvement

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| PostGIS unavailable in sidecar image | Medium | Medium | Detect at startup; fall back to Haversine math in app layer — geo features degrade gracefully, not fail |
| Open311 field-level regression breaks integrations | Low | High | Implement GeoReport v2 contract tests (Vitest) against field-name spec before launch; run in CI |
| Postgres bytea performance for large media | Medium | Low | Set max upload size limit (e.g., 10MB per file via env var); use Postgres large object API for files > 8KB |
| Prisma migration fails on pod restart with concurrent pods | Low | High | `prisma migrate deploy` is idempotent by design; K8s readiness probe prevents traffic before DB ready |
| Auth.js session vulnerabilities | Low | High | Use `AUTH_SECRET` from env; HTTPS-only secure cookies; short session TTL (configurable); staff password rotation policy |
| Leaflet/SSR hydration mismatch in Next.js App Router | Medium | Medium | Dynamic-import Leaflet components with `{ ssr: false }`; wrap in client boundaries |
| Constituent data PII exposure | Low | High | Anonymous mode per category; Person records only visible to staff/admin roles; audit log on PII access |
| Large ticket corpus degrades FTS performance | Low | Medium | GIN index on tsvector column; `VACUUM ANALYZE` guidance in ops runbook; query explain plan gates in CI |

---

## 9. Feature Index

| ID | Feature | Priority | Role(s) | Open311 Impact | Notes |
|---|---|---|---|---|---|
| F0 | Public Constituent Portal | P0 | Public | Indirect — POST /requests | Map-first, anonymous allowed per category |
| F1 | Constituent Issue Tracking | P0 | Public | GET /requests/{id} | No auth required |
| F2 | Authentication & Role-Based Sessions | P0 | Staff, Admin | API key on POST | Credentials provider; 3 roles |
| F3 | Staff Ticket Queue | P0 | Staff, Admin | None | FTS + Bookmarks |
| F4 | Staff Ticket Detail | P0 | Staff, Admin | None | Timeline, templates, media |
| F5 | Staff CRM / People Management | P1 | Staff, Admin | None | Constituent linking + dedupe |
| F6 | Admin Panel | P0 | Admin | API key CRUD | Reference data + user management |
| F7 | Open311 GeoReport v2 API | P0 | Integrators | All endpoints | Must not regress |
| F8 | Reports & Metrics Dashboard | P1 | Staff, Admin | None | CSV export; geo heat map |
| F9 | Infrastructure & Platform | P0 | Ops/Dev | None | K8s-native, health, migrations |

**Priority Legend:**
- **P0** — Critical: required for MVP / initial deployment; system cannot operate without it
- **P1** — High: required for launch but non-blocking for initial pod bring-up
- **P2** — Medium: planned for next iteration
- **P3** — Low: nice to have; deferred

---

## 10. Out of Scope (v1)

The following items are explicitly excluded from this PRD and will not be built in the initial release:

- Multi-tenant SaaS / billing / SSO federation — single municipality instance only
- Historical data migration from legacy MySQL/MariaDB — greenfield schema with seed data
- Full legacy admin edge-screen parity — phased approach; core screens first
- External object store for media (S3, GCS, etc.) — Postgres storage for sandbox model
- OAuth / social login (Google, Microsoft, etc.) — credentials-based auth is sufficient
- Mobile native apps (iOS/Android) — responsive web-first
- Docker Compose / Docker daemon at runtime — K8s-native only

---

## 11. Appendix: Data Model Overview

The Prisma schema will include the following primary entities:

- **Ticket** — core service request (id, service_code, description, address, lat, lng, status, substatus, assignee, created_at, updated_at, tsvector column for FTS)
- **Person** — constituent contact record (id, name, email, phone, notes, anonymized_at)
- **TicketPerson** — join table linking Tickets to People (with role: submitter/contact)
- **TicketHistory** — append-only audit log (ticket_id, actor_id, action, from_value, to_value, note, created_at)
- **Category** — service category (id, service_code, name, description, department_id, anon_allowed, active)
- **Department** — city department (id, name, default_assignee_id, active)
- **Substatus** — custom substatus values per status bucket (id, label, internal_label, status, sort_order, active)
- **ResponseTemplate** — canned responses (id, name, body, category_id, department_id, active)
- **Media** — file attachments (id, ticket_id, mime_type, filename, data bytea, created_at)
- **User** — staff/admin accounts (id, email, username, password_hash, role, department_id, active)
- **ApiKey** — Open311 API client keys (id, label, key_hash, scope, last_used_at, revoked_at)
- **BookmarkedFilter** — saved staff queue filters (id, user_id, name, filter_json)

---

*Document owner: uReport NG Project Team*  
*Next documents: FRD-uReportNG.md, TechArch-uReportNG.md, UserStories-uReportNG.md*
