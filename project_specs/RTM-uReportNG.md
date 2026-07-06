# Requirements Traceability Matrix
## uReport NG — City of Bloomington Municipal 311/CRM

**Project Acronym:** uReportNG  
**RTM Version:** 1.0  
**Date:** 2026-07-06  
**Status:** Active  
**Based on:** PRD-uReportNG.md v1.0, FRD-uReportNG.md v1.0, TechArch-uReportNG.md v1.0, UserStories-uReportNG.md v1.0

---

## 1. Overview

This Requirements Traceability Matrix (RTM) provides bidirectional traceability between all uReport NG specification documents. It ensures every product requirement defined in the Product Requirements Document maps to a detailed functional requirement, has a corresponding technical architecture specification, and is covered by one or more user stories with associated acceptance criteria and test cases. The RTM serves as the authoritative linking document for the City of Bloomington's modern 311/CRM rebuild and establishes the traceability chain from business need through to verifiable acceptance.

Traceability in this document spans four levels. The first level is **Product** — PRD features (F0–F9) representing user-facing capabilities, each assigned a business priority of P0 or P1. The second level is **Functional** — FRD functional requirements (F00–F09 in FRD notation, plus sub-features F06a–F06g, F07.1–F07.5, F09.1–F09.6) that specify exact inputs, outputs, validation rules, and error handling without ambiguity. The third level is **Technical** — TechArch specifications covering component architecture, data model, API design, security architecture, and deployment topology that prescribe how each functional requirement is implemented. The fourth level is **Acceptance** — user stories (US-0.1 through US-9.4) that express the capability from a user's perspective with measurable acceptance criteria that directly drive test case authoring.

The matrix also captures non-functional requirements (NFRs) from the PRD, which cross-cut multiple features and must be verified independently through performance tests, accessibility audits, and security reviews. Every ID used in this document is extracted directly from the source specification documents without modification.

---

## 2. Requirements Summary

### 2.1 PRD Features by Priority

**P0 — Critical (MVP-blocking):**
- **F0** — Public Constituent Portal: map-first issue reporting, anonymous submissions, Postgres media storage
- **F1** — Constituent Issue Tracking: ticket lookup by ID, public clustered map
- **F2** — Authentication & Role-Based Sessions: credentials provider, three roles (public/staff/admin), JWT sessions
- **F3** — Staff Ticket Queue: filterable/searchable paginated list, Bookmarks, bulk actions
- **F4** — Staff Ticket Detail: history timeline, status controls, response composition, media gallery
- **F6** — Admin Panel: categories, departments, substatuses, response templates, users, API keys, audit log
- **F7** — Open311 GeoReport v2 API: five endpoints, JSON+XML, API-key auth, rate limiting
- **F9** — Infrastructure & Platform: K8s-native pod, health endpoints, migrations, PostGIS graceful degradation

**P1 — High (required for launch):**
- **F5** — Staff CRM / People Management: constituent linking, deduplication, anonymization
- **F8** — Reports & Metrics Dashboard: volume charts, resolution time, geo density, CSV export

### 2.2 FRD Functional Requirements Summary

- **10 primary feature chunks** (F00–F09), each containing sub-features totaling 45+ discrete functional requirements
- **F06** contains 7 sub-features (F06a–F06g) covering all admin panel configuration domains plus the Admin Audit Log
- **F07** contains 5 sub-endpoint specifications (F07.1–F07.5) covering the full Open311 GeoReport v2 surface
- **F09** contains 6 sub-specifications (F09.1–F09.6) covering deployment, health, media, logging, PostGIS, and environment variables
- **4 cross-feature appendices** (Y0–Y3): full Prisma schema (15 models), API endpoint catalog (~50 endpoints), cross-feature error catalog (~45 error codes), and external integration points (7 integrations)

### 2.3 TechArch Specifications Summary

- **SPEC-ARCH** — Full-stack Next.js 15 App Router monolith, single process port 3000
- **SPEC-DATA** — PostgreSQL 16 sidecar with Prisma ORM, FTS tsvector+GIN, PostGIS optional
- **SPEC-API** — ~50 REST endpoints across public, staff, admin, and Open311 namespaces
- **SPEC-AUTH** — Auth.js v5 credentials provider, JWT, bcrypt-12, token version invalidation
- **SPEC-SEC** — No X-Frame-Options (iframe embed), Zod validation, parameterized queries, PII protection
- **SPEC-DEPLOY** — infrastructure.json sidecar declaration, migrate-and-start.js entrypoint, K8s probes
- **SPEC-MEDIA** — Postgres bytea/Large Object storage, `GET /api/media/[id]` serving route
- **SPEC-GEO** — PostGIS detection at startup, Haversine fallback, `lib/geo.ts` mode switcher

### 2.4 User Stories Summary

- **47 total user stories** across 10 epics
- **38 P0 stories** across F0, F1, F2, F3, F4, F6, F7, F9
- **9 P1 stories** across F5, F8
- **4 personas**: Marcus Webb (public constituent), Diane Kowalski (city staff), Renata Osei (city administrator), Liam Tran (third-party integrator)

---

## 3. Traceability Matrix

### 3.1 PRD Feature → FRD → TechArch → User Stories

| PRD Feature | Priority | FRD Section(s) | TechArch Section(s) | User Stories |
|-------------|----------|----------------|---------------------|--------------|
| F0: Public Constituent Portal | P0 | F00 | §2.1 (ReportingMap), §3.2 (Ticket/Person/Media schema), §4.3 (POST /api/tickets), §5.6 (input validation) | US-0.1, US-0.2, US-0.3, US-0.4, US-0.5, US-0.6 |
| F1: Constituent Issue Tracking | P0 | F01 | §2.1 (PublicMap), §3.2 (Ticket schema), §4.3 (GET /api/tickets/[id]/public, GET /api/tickets/public-map) | US-1.1, US-1.2, US-1.3 |
| F2: Authentication & Role-Based Sessions | P0 | F02 | §2.2 (lib/auth.ts), §5.1 (Auth flow), §5.2 (Role hierarchy, middleware.ts) | US-2.1, US-2.2, US-2.3 |
| F3: Staff Ticket Queue | P0 | F03 | §2.1 (TicketTable, FilterPanel), §2.2 (lib/fts.ts), §3.2 (BookmarkedFilter schema), §4.3 (GET /api/staff/tickets, PATCH bulk) | US-3.1, US-3.2, US-3.3, US-3.4, US-3.5 |
| F4: Staff Ticket Detail | P0 | F04 | §2.1 (HistoryTimeline, ResponseComposer, MediaGallery, MiniMap), §3.2 (TicketHistory/Response/Media schema), §4.3 (PATCH /api/staff/tickets/[id]) | US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-4.6 |
| F5: Staff CRM / People Management | P1 | F05 | §2.1 (staff/people pages), §2.2 (lib/fts.ts personFtsWhere), §3.2 (Person/TicketPerson schema), §4.3 (§CRM endpoints) | US-5.1, US-5.2, US-5.3, US-5.4, US-5.5 |
| F6: Admin Panel | P0 | F06, F06a–F06g | §2.1 (admin/ pages, components/admin/), §3.2 (Category/Department/Substatus/ResponseTemplate/User/ApiKey/AdminAuditLog schema), §4.3 (§Admin endpoints), §5.3 (API key storage, password hashing) | US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-6.6, US-6.7 |
| F7: Open311 GeoReport v2 API | P0 | F07, F07.1–F07.5 | §2.2 (lib/open311.ts), §4.3 (§Open311 endpoints), §4.4 (Open311 types), §5.5 (rate limiting) | US-7.1, US-7.2, US-7.3, US-7.4 |
| F8: Reports & Metrics Dashboard | P1 | F08 | §2.1 (DensityMap, staff/reports page), §4.3 (§Reports endpoints) | US-8.1, US-8.2, US-8.3, US-8.4 |
| F9: Infrastructure & Platform | P0 | F09, F09.1–F09.6 | §1.4 (deployment topology), §1.5 (startup sequence), §2.2 (lib/geo.ts, lib/logger.ts, lib/media.ts), §4.3 (§Infrastructure endpoints), §6.7 (infrastructure.json), §6.8 (env vars), §6.9 (migrate-and-start.js), §7.6 (K8s platform) | US-9.1, US-9.2, US-9.3, US-9.4 |

---

## 4. Requirements Detail

### 4.1 F0: Public Constituent Portal

**PRD Capabilities → FRD Requirements:**
- Map-first issue reporting → **F00** Process steps 1–6: Leaflet map centered on `CITY_CENTER_LAT`/`CITY_CENTER_LNG`, bbox validation, category dropdown from `GET /api/categories`
- Address autocomplete → **F00** Process step 4: Nominatim query, 5-candidate dropdown, pin placement; `GEOCODE_UNAVAILABLE` non-blocking warning
- Description entry → **F00** Input validation: ≥10 chars, ≤4000 chars; Zod schema enforced client and server
- Optional media upload → **F00** Process step 8: ≤5 files, ≤10MB, MIME `image/*` or `application/pdf`; stored as Postgres bytea/Large Object
- Anonymous / contact-required → **F00** Process step 9: `anon_allowed` per category; `CONTACT_REQUIRED` error when required fields absent
- Confirmation screen → **F00** Process steps 12–13: `201 Created` response, redirect to `/tickets/[id]/confirm`
- WCAG 2.1 AA → **F00** Sub-feature: keyboard navigation, ARIA labels, focus management throughout

**FRD → TechArch:**
- `POST /api/tickets` route handler → `app/api/tickets/route.ts` (§2.1 directory structure)
- Leaflet map component → `components/maps/ReportingMap.tsx` (§2.3, dynamic import `ssr: false`)
- Zod validation schema → `schemas/ticket.ts` CreateTicketSchema (§4.2)
- Prisma transaction (Ticket + Person + Media) → `lib/prisma.ts` singleton + `lib/media.ts` storeMedia (§2.2)

---

### 4.2 F1: Constituent Issue Tracking

**PRD Capabilities → FRD Requirements:**
- Ticket lookup by ID → **F01** Process — Ticket Lookup: public-safe fields only, mini-map, `GET /api/tickets/[id]/public`
- Public map of open issues → **F01** Process — Public Map: GeoJSON FeatureCollection, `GET /api/tickets/public-map`, 5000-feature cap
- Marker clustering → **F01**: Leaflet.markercluster at zoom < 14; cluster tap/click expands to individual markers
- Deep link / shareable URL → **F01**: stable `/tickets/[id]` URL; no auth required
- Public-only field filter → **F01**: internal staff notes (`is_public = false`) never exposed; `Response` filtered server-side

**FRD → TechArch:**
- Public ticket status page → `app/(public)/tickets/[id]/page.tsx` (§2.1)
- Public map page → `app/(public)/map/page.tsx` with `components/maps/PublicMap.tsx`
- GeoJSON route handler → `app/api/tickets/public-map/route.ts`
- Ticket schema (public fields subset) → `Ticket` model (§3.2), `Response.is_public` filter

---

### 4.3 F2: Authentication & Role-Based Sessions

**PRD Capabilities → FRD Requirements:**
- Login page → **F02** Process — Login: `POST /api/auth/[...nextauth]`, bcrypt.compare, JWT session cookie
- Route-level guards → **F02** Process — Route Guard: `middleware.ts` checks session role; `/admin/**` requires `admin` role
- Session expiry → **F02**: 8-hour TTL (`AUTH_SESSION_TTL`); redirect to `/login?callbackUrl=<original>`
- Password change → **F02** Process — Password Change: self-service at `/staff/account/password`; new policy ≥12 chars, ≥1 uppercase, ≥1 digit; token version incremented to invalidate other sessions
- No self-registration → **F02**: accounts created by admin only via F06e

**FRD → TechArch:**
- Auth.js v5 config → `lib/auth.ts` (§2.2, §7.2 full implementation)
- Middleware route guard → `middleware.ts` (§5.2 route guard implementation)
- Password change handler → `app/api/staff/account/password/route.ts`
- Zod schemas → `schemas/auth.ts` LoginSchema, PasswordChangeSchema (§4.2)
- JWT claims shape → `types/auth.ts` (§4.5)

---

### 4.4 F3: Staff Ticket Queue

**PRD Capabilities → FRD Requirements:**
- Paginated ticket list → **F03** Inputs: `page`, `page_size` (10–100), configurable columns
- Filter panel → **F03**: category, department, status/substatus, assignee, date range, geo bbox; `DATE_RANGE_INVALID`, `BBOX_INVALID` errors
- Full-text search → **F03**: `q` param → `search_vector @@ plainto_tsquery('english', ?)` via `lib/fts.ts`; p95 < 500ms
- Saved Bookmarks → **F03** Process — Saving/Loading Bookmarks: `BookmarkedFilter` records; `409 CONFLICT` on duplicate name
- Bulk actions → **F03** Process — Bulk Update: `PATCH /api/staff/tickets/bulk`; 1–100 IDs; `TicketHistory` per change
- Map view toggle → **F03**: Leaflet map of filtered tickets; `MiniMap`/`PublicMap` component

**FRD → TechArch:**
- Staff queue page → `app/staff/tickets/page.tsx` (§2.1)
- TicketTable component → `components/tickets/TicketTable.tsx` (TanStack Table, §2.3)
- FilterPanel component → `components/tickets/FilterPanel.tsx` (client component, URL-synced params)
- FTS helper → `lib/fts.ts` ticketFtsWhere (§2.2)
- BookmarkedFilter schema → `BookmarkedFilter` model (§3.2)
- Bulk update route → `app/api/staff/tickets/bulk/route.ts`; BulkUpdateSchema (§4.2)

---

### 4.5 F4: Staff Ticket Detail

**PRD Capabilities → FRD Requirements:**
- Ticket header + mini-map → **F04** Process — Viewing Ticket Detail: full relations fetched, `MiniMap` component
- Status/substatus change → **F04** Process — Status/Substatus Change: confirmation dialog, `STATUS_CHANGE` history entry, `TRANSITION_FORBIDDEN` (closed→open for staff)
- Assignee picker → **F04** Process — Assignment: typeahead `GET /api/staff/users?q=...`, `ASSIGNMENT` history entry
- History timeline → **F04**: `TicketHistory` ordered ASC; icons for `STATUS_CHANGE`, `ASSIGNMENT`, `RESPONSE`, `MEDIA_ADDED`, `SUBSTATUS_CHANGE`
- Response composition → **F04** Process — Add Response: `is_public` toggle; `is_public = true` visible on constituent page
- Template picker → **F04** Process — Add Response step 2: client-side placeholder substitution (`{{ticket_id}}`, `{{address}}`, `{{category_name}}`); server stores rendered text
- Media gallery → **F04** Process — Add Media: same upload rules as F00; `MEDIA_ADDED` history entry; served via `GET /api/media/[id]`
- Related tickets panel → **F04**: same address (~50m) or same Person; geo query branches on `GEO_MODE`

**FRD → TechArch:**
- Staff ticket detail page → `app/staff/tickets/[id]/page.tsx`
- HistoryTimeline component → `components/tickets/HistoryTimeline.tsx` (§2.3)
- ResponseComposer component → `components/tickets/ResponseComposer.tsx`
- MediaGallery component → `components/tickets/MediaGallery.tsx`
- Media storage/serving → `lib/media.ts` storeMedia/readMedia (§2.2), `app/api/media/[id]/route.ts`
- Related tickets proximity → `lib/geo.ts` distanceMeters / ST_DWithin (§2.2, §3.4)

---

### 4.6 F5: Staff CRM / People Management

**PRD Capabilities → FRD Requirements:**
- Person search → **F05** Process — Person Search: `GET /api/staff/people?q=...`; `person_search_vector @@ plainto_tsquery`; min 2 chars
- Person detail → **F05**: all linked `TicketPerson` rows with `TicketSummary[]`; PII only to staff/admin
- Link/unlink → **F05** Process — Link/Unlink: `POST /api/staff/tickets/[id]/persons`; `PERSON_LINKED` history; staff cannot unlink submitter without admin
- Merge persons → **F05** Process — Merge Persons: Prisma transaction re-points all `TicketPerson` rows; source soft-deleted with `merged_into_id`; `MERGE_SAME`, `PERSON_ANONYMIZED` errors
- Anonymization → **F05** Process — Anonymize Person: nulls name/email/phone/notes, sets `anonymized_at`; `ALREADY_ANONYMIZED` error; irreversible; linked tickets display "Anonymous Constituent"

**FRD → TechArch:**
- People list/detail pages → `app/staff/people/page.tsx`, `app/staff/people/[id]/page.tsx` (§2.1)
- Person FTS → `lib/fts.ts` personFtsWhere (§2.2), GIN index on `person_search_vector` (§3.3)
- Person/TicketPerson schema → `Person`, `TicketPerson` models (§3.2)
- Merge route → `app/api/staff/people/merge/route.ts`
- Anonymize route → `app/api/staff/people/[id]/anonymize/route.ts`

---

### 4.7 F6: Admin Panel

**PRD Capabilities → FRD Requirements:**

- **Category management (F06a):** CRUD + deactivate; `service_code` globally unique; `409 DUPLICATE_SERVICE_CODE`; `anon_allowed` toggle; Open311 service_code mapping
- **Department management (F06b):** CRUD + deactivate; `default_assignee_id` optional; deactivating dept with active categories requires confirmation
- **Substatus management (F06c):** CRUD + ordering per parent status; drag-to-reorder → `PATCH /api/admin/substatuses/reorder`; `label` unique within parent status
- **Response template management (F06d):** CRUD + deactivate; `{{ticket_id}}`, `{{address}}`, `{{category_name}}` placeholders; unknown tokens warned not errored
- **User account management (F06e):** Create staff/admin accounts; deactivate; admin password reset increments `token_version`; `SELF_DEACTIVATION` guard; `409 DUPLICATE_USERNAME`, `409 DUPLICATE_EMAIL`
- **Open311 API key management (F06f):** Generate 32-byte hex key (shown once); store only SHA-256 hash; `scope = read|write`; revoke sets `revoked_at`; `409 ALREADY_REVOKED`
- **Admin audit log (F06g):** Append-only `AdminAuditLog` table; every F06a–F06f write appends entry in same transaction; filterable by actor, resource type, action, date range; no PII in metadata

**FRD → TechArch:**
- Admin pages → `app/admin/` directory (§2.1): categories, departments, substatuses, response-templates, users, api-keys, audit-log
- Admin form components → `components/admin/` (drawer/dialog forms, react-hook-form + Zod resolver, §2.3)
- Admin Zod schemas → `schemas/admin.ts` (§4.2 schemas directory)
- API key hashing → `lib/open311.ts` verifyApiKey, Node.js `crypto.SHA256` (§2.2, §5.3)
- AdminAuditLog schema → `AdminAuditLog` model Y0.15 (§3.2), indexes on actor_id, resource_type/resource_id, created_at
- Admin endpoints → `app/api/admin/` route handlers (§4.3 §Admin)

---

### 4.8 F7: Open311 GeoReport v2 API

**PRD Capabilities → FRD Requirements:**

- `GET /api/v2/services` (F07.1): active categories only; exact GeoReport v2 field names; JSON default, XML via `format=xml`
- `GET /api/v2/services/{service_code}` (F07.2): single service definition + `attributes: []`; 404 if inactive
- `POST /api/v2/requests` (F07.3): API-key auth (`api_key` param or `X-Api-Key` header); SHA-256 hash lookup; `write` scope required; field mapping uses `long` (not `lng`); creates Ticket+Person in transaction
- `GET /api/v2/requests` (F07.4): public with rate limit (`OPEN311_RATE_LIMIT` req/min per IP); Open311 status mapping (`open`→`open|in_progress`, `closed`→`closed|archived`); pagination via `X-Total-Count` headers
- `GET /api/v2/requests/{service_request_id}` (F07.5): returns array of one item per spec; public + rate limited

**FRD → TechArch:**
- Open311 route handlers → `app/api/v2/` (§2.1)
- Field mapper + XML serializer → `lib/open311.ts` ticketToServiceRequest, categoryToService, toXml (§2.2, §7.5)
- Open311 Zod schema → `schemas/open311.ts` Open311PostRequestSchema (§4.2)
- Open311 TypeScript types → `types/open311.ts` Open311Service, Open311ServiceRequest (§4.4)
- Rate limiter → `lib/rate-limit.ts` checkRateLimit, sliding window Map (§2.2, §5.5)
- API key verification → `lib/open311.ts` verifyApiKey + `ApiKey` model (§2.2, §5.2)

---

### 4.9 F8: Reports & Metrics Dashboard

**PRD Capabilities → FRD Requirements:**
- Volume by category/department → **F08** Process — Volume by Category: `GROUP BY category_id, date_trunc(interval, created_at)`; Recharts bar/line chart
- Open vs. closed breakdown → **F08** Process — Open vs. Closed: `SELECT status, COUNT(*)`; donut chart; clicking segment navigates to queue filtered by status
- Average resolution time → **F08** Process — Average Resolution Time: computed from first `TicketHistory` where `to_value = 'closed'`; mean + median per category/department
- Geographic density view → **F08** Process — Geographic Density View: GeoJSON from `GET /api/staff/reports/geo-density`; Leaflet cluster/heat layer
- Date range picker → **F08**: presets Last 7d/30d/90d + custom; max 366-day span (`DATE_RANGE_TOO_WIDE`)
- CSV export → **F08** Process — CSV Export: streaming response, `Content-Disposition: attachment`, 10,000-row cap, `X-Export-Truncated: true` header

**FRD → TechArch:**
- Reports dashboard page → `app/staff/reports/page.tsx` (§2.1)
- DensityMap component → `components/maps/DensityMap.tsx` (§2.3)
- Reports route handlers → `app/api/staff/reports/` (§4.3 §Reports): volume-by-category, volume-by-department, status-breakdown, resolution-time, geo-density, export
- Chart library → Recharts `^2.x` (§6.2)

---

### 4.10 F9: Infrastructure & Platform

**PRD Capabilities → FRD Requirements:**

- K8s-native deployment (F09.1): `infrastructure.json` declares `sidecar_requirements: ["postgres"], port: 3000`; `next.config.ts` (`.ts` extension); no Docker daemon at runtime
- Database bootstrapping (F09.1): `scripts/migrate-and-start.js` waits for DB (60s max, exponential backoff), runs `prisma migrate deploy`, optional seed on `SEED_ON_BOOT=true`
- Health endpoints (F09.2): `GET /api/health/live` → `{status:"ok"}` no DB check; `GET /api/health/ready` → `SELECT 1` + migration check; `503` on failure
- Media storage/serving (F09.3): files ≤ `MEDIA_LO_THRESHOLD_KB` → `Media.data` bytea; files above → Postgres Large Object API, `Media.lo_oid`; `GET /api/media/[id]` streams with auth check
- Structured logging (F09.4): JSON stdout; `LOG_LEVEL` env var; no PII in log fields
- PostGIS auto-detection (F09.5): `SELECT PostGIS_Version()` at startup; `GEO_MODE = 'postgis'` or `'haversine'`; no startup failure if absent; all geo queries branch on `GEO_MODE`
- 12-factor config (F09.6): all secrets from env vars; `DATABASE_URL` and `AUTH_SECRET` required; process exits on missing required vars

**FRD → TechArch:**
- Migrate-and-start entrypoint → `scripts/migrate-and-start.js` (§6.9 full implementation)
- Health routes → `app/api/health/live/route.ts`, `app/api/health/ready/route.ts` (§7.6 implementations)
- Geo utilities → `lib/geo.ts` detectGeoMode, buildBboxFilter, distanceMeters (§2.2, §3.4)
- Logger → `lib/logger.ts` (§2.2)
- Media utilities → `lib/media.ts` storeMedia, readMedia, deleteMedia (§2.2, §3.5 F09.3)
- Infrastructure declaration → `infrastructure.json` (§6.7)
- Environment variables spec → §6.8 full table
- `next.config.ts` (no X-Frame-Options, security headers) → §6.6, §5.4

---

## 5. Test Case Coverage

### 5.1 Test Coverage Matrix by Feature

| Feature | User Stories | Planned Unit Tests | Planned E2E Tests | A11y Tests | Coverage Target |
|---------|--------------|--------------------|-------------------|------------|-----------------|
| F0: Public Constituent Portal | 6 (US-0.1–0.6) | CreateTicketSchema validation, category lookup, anonymous mode logic, media MIME/size validation | Ticket submission flow, photo upload, confirmation page, address search, anonymous submission | axe-core on `/` and `/tickets/[id]/confirm` | 100% acceptance criteria |
| F1: Constituent Issue Tracking | 3 (US-1.1–1.3) | Public ticket field filter (no internal notes), GeoJSON cap at 5000 | Ticket lookup by ID, public map load, deep link share | axe-core on `/tickets/[id]`, `/map` | 100% acceptance criteria |
| F2: Auth & Role-Based Sessions | 3 (US-2.1–2.3) | bcrypt verify, token version check, Zod password policy schema | Login flow, failed login message, session expiry redirect, staff→admin 403, password change | axe-core on `/login` | 100% acceptance criteria |
| F3: Staff Ticket Queue | 5 (US-3.1–3.5) | FTS query builder, date range validation, bbox parsing, bookmark name uniqueness | Queue load with filters, FTS search, bookmark save/load, bulk status update, map view toggle | axe-core on `/staff/tickets` | 100% acceptance criteria |
| F4: Staff Ticket Detail | 6 (US-4.1–4.6) | Status transition validation (closed→open admin-only), substatus mismatch, response body empty check | View ticket detail, change status, assign staff member, add internal/public note, insert template, upload/download media | axe-core on `/staff/tickets/[id]` | 100% acceptance criteria |
| F5: Staff CRM / People Management | 5 (US-5.1–5.5) | Person FTS query builder, merge same-person guard, anonymize idempotency | Person search, view constituent history, link/unlink person, merge duplicate, anonymize record | axe-core on `/staff/people` | 100% acceptance criteria |
| F6: Admin Panel | 7 (US-6.1–6.7) | service_code uniqueness, username/email uniqueness, API key SHA-256 hash, token_version increment, audit log PII strip | Category CRUD, department create, substatus reorder, template create, user create/deactivate, API key generate/revoke, audit log view/filter | axe-core on `/admin/*` pages | 100% acceptance criteria |
| F7: Open311 GeoReport v2 API | 4 (US-7.1–7.4) | Open311 field name contract tests (service_request_id, `long` not `lng`, requested_datetime), XML serialization, API key scope check, rate limit sliding window | GET services JSON+XML, POST request with write key, GET requests with filters, GET single request | — (API surface, no UI) | 100% GeoReport v2 field compliance |
| F8: Reports & Metrics Dashboard | 4 (US-8.1–8.4) | Date range validation (366-day cap), resolution time computation from TicketHistory | Dashboard load, volume charts, open/closed donut, geo density map, CSV export download | axe-core on `/staff/reports` | 100% acceptance criteria |
| F9: Infrastructure & Platform | 4 (US-9.1–9.4) | Readiness probe DB check, media bytea/LO routing by threshold, PostGIS detection mock (present/absent), env var required check | Pod start with migrations, `/api/health/live` 200, `/api/health/ready` 200 and 503, media upload→serve roundtrip, Haversine fallback geo query | — (infrastructure surface) | 100% acceptance criteria |

### 5.2 Test Case Index (Representative Samples)

| Test ID | Type | Feature | User Story | Description | Expected Result |
|---------|------|---------|------------|-------------|----------------|
| TEST-F0-001 | Unit | F0 | US-0.3 | Zod CreateTicketSchema rejects description < 10 chars | 422 VALIDATION_ERROR with field_errors.description |
| TEST-F0-002 | Unit | F0 | US-0.5 | Category with `anon_allowed=false` requires name + email | 422 CONTACT_REQUIRED |
| TEST-F0-003 | Unit | F0 | US-0.4 | File > MEDIA_MAX_SIZE_MB rejected | 422 MEDIA_TOO_LARGE |
| TEST-F0-004 | E2E | F0 | US-0.1–0.6 | Complete ticket submission with pin drop, category, description, photo | HTTP 201, redirect to /tickets/[id]/confirm, ticket ID displayed |
| TEST-F0-005 | A11y | F0 | US-0.1 | axe-core scan of public portal home | Zero critical a11y violations |
| TEST-F1-001 | E2E | F1 | US-1.1 | Navigate to `/tickets/[id]` for known ticket | Status page renders without internal notes |
| TEST-F1-002 | Unit | F1 | US-1.2 | public-map endpoint caps response at 5000 features | GeoJSON contains ≤5000 features |
| TEST-F2-001 | Unit | F2 | US-2.1 | Login with incorrect password returns 401 | "Invalid username or password" — no enumeration |
| TEST-F2-002 | Unit | F2 | US-2.2 | staff role accessing /api/admin/ returns 403 | 403 FORBIDDEN |
| TEST-F2-003 | Unit | F2 | US-2.3 | Password change with token_version increment | All prior JWTs rejected on next request |
| TEST-F2-004 | E2E | F2 | US-2.1 | Login with valid staff credentials | Redirected to /staff/tickets, session cookie set |
| TEST-F3-001 | Unit | F3 | US-3.2 | FTS query builder escapes special chars | plainto_tsquery call is parameterized |
| TEST-F3-002 | Unit | F3 | US-3.4 | Bulk update with >100 ticket IDs | 422 BULK_TOO_LARGE |
| TEST-F3-003 | E2E | F3 | US-3.3 | Save bookmark, clear filters, reload bookmark | Filters restored from BookmarkedFilter record |
| TEST-F4-001 | Unit | F4 | US-4.2 | staff role attempting closed→open returns 403 | 403 TRANSITION_FORBIDDEN |
| TEST-F4-002 | Unit | F4 | US-4.2 | substatus_id belonging to different parent status | 422 SUBSTATUS_MISMATCH |
| TEST-F4-003 | E2E | F4 | US-4.4 | Add public response; verify visible on /tickets/[id] | Response body appears on constituent tracking page |
| TEST-F4-004 | E2E | F4 | US-4.6 | Upload media to ticket; download via /api/media/[id] | File bytes returned with correct Content-Type |
| TEST-F5-001 | Unit | F5 | US-5.4 | Merge person with source_id == target_id | 422 MERGE_SAME |
| TEST-F5-002 | E2E | F5 | US-5.5 | Anonymize person; verify PII nulled; linked tickets intact | anonymized_at set; Person display shows "Anonymous Constituent" |
| TEST-F6-001 | Unit | F6 | US-6.5 | Admin self-deactivation attempt | 403 SELF_DEACTIVATION |
| TEST-F6-002 | Unit | F6 | US-6.6 | API key generation stores only SHA-256 hash | plaintext_key not present in ApiKey record |
| TEST-F6-003 | Unit | F6 | US-6.7 | Admin write action creates AdminAuditLog entry in same transaction | AdminAuditLog row exists with correct resource_type, actor_id |
| TEST-F6-004 | Unit | F6 | US-6.7 | Audit log metadata strips PII fields | metadata JSON contains no name/email/phone/password_hash |
| TEST-F7-001 | Unit | F7 | US-7.2 | Open311 response uses `long` not `lng` | service_request object contains `long` field |
| TEST-F7-002 | Unit | F7 | US-7.2 | Open311 response uses `requested_datetime` not `created_at` | service_request object contains `requested_datetime` |
| TEST-F7-003 | Unit | F7 | US-7.1 | GET /api/v2/services returns `<services>` XML with correct element names | XML valid, `<service>` children with `<service_code>` etc. |
| TEST-F7-004 | Unit | F7 | US-7.3 | Rate limit returns 429 with Retry-After header | Response 429, Retry-After header present |
| TEST-F8-001 | Unit | F8 | US-8.1 | Date range exceeding 366 days returns error | 422 DATE_RANGE_TOO_WIDE |
| TEST-F8-002 | E2E | F8 | US-8.4 | CSV export download | File downloaded with Content-Disposition attachment, correct columns |
| TEST-F9-001 | Unit | F9 | US-9.2 | /api/health/ready returns 503 when DB unreachable | 503 with DB_UNAVAILABLE error code |
| TEST-F9-002 | Unit | F9 | US-9.4 | PostGIS detection failure sets GEO_MODE = haversine | global.GEO_MODE = 'haversine', INFO log written |
| TEST-F9-003 | Unit | F9 | US-9.3 | Files above MEDIA_LO_THRESHOLD_KB stored via Large Object | Media.lo_oid set, Media.data null |
| TEST-F9-004 | E2E | F9 | US-9.1 | Pod startup: migrations run before server binds | /api/health/ready returns 200 after boot |

### 5.3 Non-Functional Requirements Test Coverage

| NFR Category | Requirement | Test Method | Acceptance Gate |
|--------------|-------------|-------------|----------------|
| Performance | Ticket list page LCP < 2.5s on 4G | Lighthouse (Playwright) | LCP ≤ 2500ms |
| Performance | Postgres FTS query p95 < 500ms | Load test against sidecar DB | p95 ≤ 500ms |
| Accessibility | WCAG 2.1 AA throughout | axe-core via @axe-core/playwright in e2e | Zero critical violations |
| Accessibility | Lighthouse Accessibility ≥ 90 | Lighthouse CI | Score ≥ 90 |
| Security | No X-Frame-Options header emitted | Response header inspection in e2e | Header absent |
| Security | SQL injection prevention | Prisma parameterized query audit | No raw string concatenation |
| Reliability | Pod restart recovery < 30s | Timed health probe polling in e2e | /api/health/ready 200 within 30s |
| Reliability | prisma migrate deploy idempotent | Re-run migration on seeded DB | No error, no duplicate migration |
| Config | No .env committed | git grep / CI lint | No .env file in repo |
| Open311 | Zero field-name regressions | Vitest contract tests (TEST-F7-001, -002, -003) | All Open311 field names match spec |

---

## 6. Bidirectional Traceability Index

### 6.1 User Story → FRD → PRD

| User Story | Title | FRD Section | PRD Feature |
|------------|-------|-------------|-------------|
| US-0.1 | Drop a Map Pin to Report an Issue Location | F00 (Process steps 1–5) | F0 |
| US-0.2 | Search an Address to Set the Issue Location | F00 (Process step 4, GEOCODE_UNAVAILABLE) | F0 |
| US-0.3 | Select a Category and Submit a Description | F00 (Process steps 6–7, Validation) | F0 |
| US-0.4 | Attach a Photo to a Report | F00 (Process step 8, Error States MEDIA_*) | F0 |
| US-0.5 | Submit Anonymously or with Contact Information | F00 (Process step 9, CONTACT_REQUIRED) | F0 |
| US-0.6 | Receive a Confirmation with Ticket ID | F00 (Process steps 11–13, Outputs) | F0 |
| US-1.1 | Look Up a Ticket Status by ID | F01 (Process — Ticket Lookup) | F1 |
| US-1.2 | View a Public Map of All Open Issues | F01 (Process — Public Map) | F1 |
| US-1.3 | Share a Direct Link to a Ticket | F01 (Deep link, Outputs) | F1 |
| US-2.1 | Log In with Staff Credentials | F02 (Process — Login) | F2 |
| US-2.2 | Access Staff and Admin Routes Securely | F02 (Process — Route Guard) | F2 |
| US-2.3 | Change My Own Password | F02 (Process — Password Change) | F2 |
| US-3.1 | View and Filter the Daily Ticket Queue | F03 (Process — Loading the Queue, Inputs) | F3 |
| US-3.2 | Search Tickets by Keyword or Address | F03 (FTS query, `q` param) | F3 |
| US-3.3 | Save and Load a Queue Filter Bookmark | F03 (Process — Saving/Loading Bookmark) | F3 |
| US-3.4 | Bulk-Update Status or Assignee on Multiple Tickets | F03 (Process — Bulk Update) | F3 |
| US-3.5 | Toggle Map View to Visualize the Queue Geographically | F03 (Sub-features: map view toggle) | F3 |
| US-4.1 | View Complete Ticket Information on One Screen | F04 (Process — Viewing Ticket Detail) | F4 |
| US-4.2 | Update Ticket Status and Substatus | F04 (Process — Status/Substatus Change) | F4 |
| US-4.3 | Assign a Ticket to a Staff Member | F04 (Process — Assignment) | F4 |
| US-4.4 | Write an Internal Note or Public Response | F04 (Process — Add Response) | F4 |
| US-4.5 | Insert a Canned Response Template | F04 (Process — Add Response step 2) | F4 |
| US-4.6 | View, Download, and Upload Ticket Media | F04 (Process — Add Media) | F4 |
| US-5.1 | Search for a Constituent Contact Record | F05 (Process — Person Search) | F5 |
| US-5.2 | View a Constituent's Full Ticket History | F05 (Person detail, Outputs) | F5 |
| US-5.3 | Link or Unlink a Person to a Ticket | F05 (Process — Link/Unlink) | F5 |
| US-5.4 | Merge Duplicate Constituent Records | F05 (Process — Merge Persons) | F5 |
| US-5.5 | Anonymize a Constituent Record on Request | F05 (Process — Anonymize Person) | F5 |
| US-6.1 | Manage Service Categories | F06a | F6 |
| US-6.2 | Manage Departments and Default Assignees | F06b | F6 |
| US-6.3 | Configure Custom Substatuses | F06c | F6 |
| US-6.4 | Manage Canned Response Templates | F06d | F6 |
| US-6.5 | Create and Manage Staff User Accounts | F06e | F6 |
| US-6.6 | Generate and Revoke Open311 API Keys | F06f | F6 |
| US-6.7 | View the Admin Action Audit Log | F06g (Admin Audit Log) | F6 |
| US-7.1 | Retrieve the List of Active Service Categories | F07.1 (GET /api/v2/services) | F7 |
| US-7.2 | Submit a Service Request via the API | F07.3 (POST /api/v2/requests) | F7 |
| US-7.3 | Query and Filter Service Requests | F07.4 (GET /api/v2/requests) | F7 |
| US-7.4 | Retrieve a Single Service Request by ID | F07.5 (GET /api/v2/requests/{id}) | F7 |
| US-8.1 | View Ticket Volume Trends by Category and Department | F08 (Process — Volume by Category) | F8 |
| US-8.2 | View Open vs. Closed Breakdown and Average Resolution Time | F08 (Process — Open vs. Closed, Resolution Time) | F8 |
| US-8.3 | View a Geographic Density Map of Ticket Activity | F08 (Process — Geographic Density View) | F8 |
| US-8.4 | Export Report Data to CSV | F08 (Process — CSV Export) | F8 |
| US-9.1 | Deploy and Start as a Single Kubernetes Pod | F09.1 (Kubernetes Deployment) | F9 |
| US-9.2 | Provide Liveness and Readiness Health Endpoints | F09.2 (Health Endpoints) | F9 |
| US-9.3 | Store and Serve Media Files from Postgres | F09.3 (Media Storage & Serving) | F9 |
| US-9.4 | Run Reliably Without PostGIS and Degrade Gracefully | F09.5 (PostGIS Auto-Detection) | F9 |

### 6.2 TechArch Component → Feature Coverage

| TechArch Component | File / Section | Covers Features |
|-------------------|----------------|----------------|
| `app/api/tickets/route.ts` | §2.1, §4.3 §Public Tickets | F0 |
| `app/api/tickets/[id]/public/route.ts` | §2.1, §4.3 | F1 |
| `app/api/tickets/public-map/route.ts` | §2.1, §4.3 | F1 |
| `app/api/auth/[...nextauth]/route.ts` | §2.1, §4.3 §Auth | F2 |
| `middleware.ts` | §2.1, §5.2 | F2 |
| `app/api/staff/tickets/route.ts` | §2.1, §4.3 §Staff Tickets | F3 |
| `app/api/staff/tickets/bulk/route.ts` | §2.1, §4.3 | F3 |
| `app/api/staff/bookmarks/route.ts` | §2.1, §4.3 §Staff Bookmarks | F3 |
| `app/api/staff/tickets/[id]/route.ts` | §2.1, §4.3 | F4 |
| `app/api/staff/tickets/[id]/responses/route.ts` | §2.1, §4.3 | F4 |
| `app/api/staff/tickets/[id]/media/route.ts` | §2.1, §4.3 | F4, F9 |
| `app/api/staff/people/route.ts` | §2.1, §4.3 §CRM | F5 |
| `app/api/staff/people/merge/route.ts` | §2.1, §4.3 | F5 |
| `app/api/admin/categories/route.ts` | §2.1, §4.3 §Admin | F6 |
| `app/api/admin/api-keys/route.ts` | §2.1, §4.3 | F6 |
| `app/api/admin/audit-log/route.ts` | §2.1, §4.3 | F6 |
| `app/api/v2/requests/route.ts` | §2.1, §4.3 §Open311 | F7 |
| `app/api/staff/reports/export/route.ts` | §2.1, §4.3 §Reports | F8 |
| `app/api/health/live/route.ts` | §2.1, §7.6 | F9 |
| `app/api/health/ready/route.ts` | §2.1, §7.6 | F9 |
| `app/api/media/[id]/route.ts` | §2.1, §4.3 §Media | F9, F0, F4 |
| `lib/auth.ts` | §2.2, §7.2 | F2 |
| `lib/geo.ts` | §2.2, §3.4 | F3, F4, F7, F8, F9 |
| `lib/fts.ts` | §2.2, §3.3 | F3, F5 |
| `lib/media.ts` | §2.2, §3.5 | F0, F4, F9 |
| `lib/open311.ts` | §2.2, §7.5 | F6, F7 |
| `lib/rate-limit.ts` | §2.2, §5.5 | F7 |
| `lib/logger.ts` | §2.2, §3.5 F09.4 | F9 |
| `lib/prisma.ts` | §2.2 | All features |
| `scripts/migrate-and-start.js` | §6.9 | F9 |
| `infrastructure.json` | §6.7 | F9 |
| `next.config.ts` | §6.6, §5.4 | F9, All |
| `prisma/schema.prisma` | §3.2 | All features |
| `components/maps/ReportingMap.tsx` | §2.3 | F0 |
| `components/maps/PublicMap.tsx` | §2.3 | F1 |
| `components/maps/MiniMap.tsx` | §2.3 | F1, F4 |
| `components/maps/DensityMap.tsx` | §2.3 | F8 |
| `components/tickets/TicketTable.tsx` | §2.3 | F3 |
| `components/tickets/FilterPanel.tsx` | §2.3 | F3 |
| `components/tickets/HistoryTimeline.tsx` | §2.3 | F4 |
| `components/tickets/ResponseComposer.tsx` | §2.3 | F4 |
| `components/tickets/MediaGallery.tsx` | §2.3 | F4 |
| `schemas/ticket.ts` | §4.2 | F0, F3, F4 |
| `schemas/auth.ts` | §4.2 | F2 |
| `schemas/admin.ts` | §4.2 | F6 |
| `schemas/open311.ts` | §4.2 | F7 |

### 6.3 Database Schema → Feature Coverage

| Prisma Model | FRD Section | PRD Features |
|-------------|-------------|--------------|
| `Ticket` | Y0.1 | F0, F1, F3, F4, F7, F8 |
| `Person` | Y0.2 | F0, F5 |
| `TicketPerson` | Y0.3 | F0, F5 |
| `Category` / `CategoryGroup` | Y0.4 | F0, F6a, F7 |
| `Department` | Y0.5 | F3, F6b |
| `Substatus` | Y0.6 | F4, F6c |
| `TicketHistory` | Y0.7 | F3, F4, F5, F8 |
| `Response` | Y0.8 | F1, F4 |
| `ResponseTemplate` | Y0.9 | F4, F6d |
| `Media` | Y0.10 | F0, F4, F9 |
| `User` | Y0.11 | F2, F6e |
| `ApiKey` | Y0.12 | F6f, F7 |
| `BookmarkedFilter` | Y0.13 | F3 |
| `AdminAuditLog` | Y0.15 | F6g |

---

## 7. Change Management

### 7.1 Change Log

| Version | Date | Author | Section Changed | Description |
|---------|------|--------|-----------------|-------------|
| 1.0 | 2026-07-06 | uReport NG Project Team | All | Initial RTM created from PRD v1.0, FRD v1.0, TechArch v1.0, UserStories v1.0 |

### 7.2 Change Control Process

Changes to any source specification document (PRD, FRD, TechArch, UserStories) must trigger an RTM update following this process:

1. **Identify impact** — Determine which RTM sections are affected by the change (traceability matrix, requirements detail, test coverage, bidirectional index)
2. **Update source document** — Increment the version of the changed spec document
3. **Update RTM** — Update all affected sections; increment RTM version; add change log entry
4. **Review** — RTM update reviewed by the same approver who approved the source document change
5. **Baseline** — Updated RTM committed to version control alongside the updated source document

### 7.3 Traceability Gap Policy

If any gap is detected (PRD feature without FRD requirement, FRD requirement without TechArch spec, or user story without acceptance test), it must be logged as a defect and resolved before the feature can be marked "implementation-ready." Gaps are tracked by maintaining this document as the single source of traceability truth.

---

## 8. Approval

### 8.1 Document Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | — | _______________ | ___________ |
| Engineering Lead | — | _______________ | ___________ |
| QA Lead | — | _______________ | ___________ |
| Security Reviewer | — | _______________ | ___________ |
| Operations / DevOps | — | _______________ | ___________ |

### 8.2 Approval Criteria

This RTM is considered approved when:
- All 10 PRD features (F0–F9) have corresponding FRD sections, TechArch specifications, and at least one user story
- All 47 user stories (US-0.1–US-9.4) are traceable back to a PRD feature and FRD section
- All 14 Prisma models are mapped to the features they serve
- All ~50 API endpoints are mapped to feature and FRD section
- No traceability gaps exist (every row in Section 3.1 is populated)
- Non-functional requirements in Section 5.3 have defined test methods and acceptance gates

### 8.3 Baseline Status

| Artifact | Version | Status |
|----------|---------|--------|
| PRD-uReportNG.md | 1.0 | Active |
| FRD-uReportNG.md | 1.0 | Active |
| TechArch-uReportNG.md | 1.0 | Active |
| UserStories-uReportNG.md | 1.0 | Active |
| **RTM-uReportNG.md** | **1.0** | **Active** |

---

*Document owner: uReport NG Project Team*  
*Upstream sources: PRD-uReportNG.md v1.0, FRD-uReportNG.md v1.0, TechArch-uReportNG.md v1.0, UserStories-uReportNG.md v1.0*  
*Downstream consumers: QA test plans, implementation phase plans, sprint acceptance criteria, security review checklist*
