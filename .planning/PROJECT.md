# uReport NG

## What This Is

A modern rebuild of the City of Bloomington uReport municipal 311/CRM system as a single-deployable Next.js 15 web application. It enables constituents to report local issues via a map-first interface and allows city staff to manage, track, and respond to those reports — all while preserving full Open311 GeoReport v2 API compatibility for existing third-party integrations.

## Core Value

City constituents can report municipal issues and staff can manage the full ticket lifecycle — all from one responsive, accessible web app running as a single Kubernetes pod with a Postgres sidecar.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Constituent public portal: report issues with map pin/address, category, description, optional photo, optional contact (anonymous allowed per category)
- [ ] Constituent issue tracking: look up a ticket by ID and see its status; view public map of open issues (clustered)
- [ ] Open311 GeoReport v2 API: GET /services, GET /services/{id}, POST /requests, GET /requests, GET /requests/{id} — JSON + XML, API-key auth
- [ ] Staff ticket queue: filterable (category, dept, status, date, geo bbox), full-text search, saved views (Bookmarks)
- [ ] Staff ticket detail: history timeline, status/substatus changes, assignment, templated responses, media gallery, map
- [ ] Staff CRM/People: link tickets to constituents, dedupe contacts, contact history
- [ ] Admin panel: categories, departments, substatuses, response templates, users/roles, Open311 API client keys
- [ ] Reports/Metrics dashboard: volume by category/dept, open vs closed, avg resolution time, geographic heat/cluster view
- [ ] Auth: role-based sessions (public / staff / admin) via Auth.js credentials provider
- [ ] PostgreSQL 16 via Prisma ORM: full data model (Ticket, Person, Category, Department, TicketHistory, Media, etc.)
- [ ] Postgres full-text search (tsvector + GIN) replacing legacy Solr
- [ ] PostGIS extension for geo queries; graceful degradation to lat/lng columns if PostGIS unavailable
- [ ] Map-first UI: Leaflet + react-leaflet + OpenStreetMap tiles; ticket clustering; responsive, WCAG 2.1 AA
- [ ] Light/dark mode with system default; shadcn/ui + Tailwind CSS + lucide icons
- [ ] Single K8s-native process: one port (3000), prisma migrate deploy at boot, DATABASE_URL from env, /api/health liveness + readiness endpoints
- [ ] Media uploads stored in Postgres (bytea/large object) — no local FS reliance (ephemeral pod disk)
- [ ] 12-factor config: all secrets/URLs from environment variables

### Out of Scope

- Multi-tenant SaaS / billing / SSO federation — single municipality instance only
- Historical data migration — greenfield schema + seed data
- Full legacy admin edge-screen parity on day one — phased approach
- Docker Compose / Docker daemon at runtime — K8s-native only
- External object store for media — Postgres storage for sandbox model
- OAuth / social login — credentials-based auth sufficient for this deployment
- Mobile native app — responsive web first

## Context

**Legacy system:** PHP MVC (bespoke) with MySQL/MariaDB and Solr. The existing codebase in this repo is the legacy system being replaced — not modified.

**Runtime environment:** Pivota Kubernetes sandbox pod. One process, one port, Postgres sidecar injected via `DATABASE_URL` env var and `PIVOTA_DB_MODE=sidecar-postgres`. Infrastructure declared in `infrastructure.json` with `sidecar_requirements: ["postgres"]`.

**Stack rationale:** Full-stack Next.js 15 (App Router, React 19, TypeScript) was chosen over split NestJS API + Next.js frontend because one process/one port maps cleanly to the single-pod sandbox model (mirrors QuickNotes/CellarLite precedent on this platform).

**Maps:** OpenStreetMap tiles + Leaflet require no proprietary API key. PostGIS enables native geo queries for clustering/proximity; if the sidecar image lacks PostGIS, the app falls back to lat/lng columns with app-level distance math.

**Open311 compatibility:** Existing city integrations (mobile apps, 311 aggregators) rely on GeoReport v2 field semantics. These must keep working unchanged. Content negotiation must support both JSON and XML responses.

## Constraints

- **Runtime**: Single Next.js process, port 3000, no Docker daemon — K8s sandbox pod
- **Database**: PostgreSQL 16 sidecar only; DATABASE_URL from env; no bundled DB
- **Migrations**: `prisma migrate deploy` runs natively at boot (idempotent); no manual provisioning
- **Media storage**: Postgres bytea/large object — no local filesystem writes (ephemeral disk)
- **Testing**: Vitest (unit) + Playwright (e2e); no testcontainers, no `docker run` in verify
- **PostGIS**: Treat as enhancement, not hard dep — degrade gracefully if unavailable
- **Frame/CSP**: Do not emit `X-Frame-Options: DENY/SAMEORIGIN` or `frame-ancestors 'none'/'self'` — Pivota Preview embeds app in iframe
- **next.config**: Must use `.ts` extension only with Next 15+; pin `next >= 15` explicitly
- **Accessibility**: WCAG 2.1 AA throughout; keyboard nav, focus states, ARIA on map/list
- **Config**: 12-factor — all secrets and URLs from environment variables, never baked in

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Full-stack Next.js 15 (single process) | One port maps cleanly to K8s single-pod sandbox; avoids dual-process complexity at this scale | — Pending |
| Prisma ORM + PostgreSQL 16 | Type-safe access; `prisma migrate deploy` runs natively at boot against sidecar | — Pending |
| Postgres FTS (tsvector + GIN) instead of Solr | Eliminates second stateful service; fits one-sidecar model | — Pending |
| PostGIS as enhancement, not hard dep | Sidecar image may lack PostGIS; graceful degradation preserves deployability | — Pending |
| Postgres bytea for media | No external object store; stays within one-sidecar model for sandbox | — Pending |
| Auth.js (credentials + role-based sessions) | Roles: public/staff/admin; no OAuth complexity needed for single-instance municipal deployment | — Pending |
| OpenStreetMap + Leaflet (no proprietary key) | Avoids API key management and cost; open tiles sufficient for municipal 311 use | — Pending |
| shadcn/ui + Tailwind CSS | Fast path to accessible, themed, light/dark UI without custom design system overhead | — Pending |

---
*Last updated: 2026-07-06 after initialization*
