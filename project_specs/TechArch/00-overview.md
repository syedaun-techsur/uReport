# Technical Architecture Document
## uReport NG — City of Bloomington Municipal 311/CRM

**Project Acronym:** uReportNG  
**TechArch Version:** 1.0  
**Date:** 2026-07-06  
**Status:** Active  
**Based on:** PRD-uReportNG.md v1.0, FRD-uReportNG.md v1.0  

---

## 1. Architectural Overview

### 1.1 Architecture Pattern

uReport NG follows a **Full-Stack Monolith with Server-Rendered Islands** pattern using Next.js 15 App Router. The architecture places all application logic — API routes, server components, client components, and background startup tasks — inside a single Node.js process. This maps cleanly to the Pivota Kubernetes single-pod sandbox model.

**Key pattern decisions:**
- **Server Components** (RSC) for data-fetching pages (ticket detail, admin lists) — zero client-side bundle cost for static data
- **Client Components** (`'use client'`) for interactive UI — map views, forms, filter panels, chart widgets
- **Route Handlers** (`app/api/**/route.ts`) for all REST API surfaces — public, staff, admin, Open311
- **Middleware** (`middleware.ts`) for Auth.js session guard on `/staff/**` and `/admin/**`
- **No separate API server** — Next.js internal API routes serve both the UI and external Open311 clients

### 1.2 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Kubernetes Pod (Pivota Sandbox)                    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Next.js 15 App (port 3000)                        │  │
│  │                                                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │  │
│  │  │  App Router  │  │  Middleware  │  │  Route Handlers     │  │  │
│  │  │  Pages / RSC │  │  (auth guard)│  │  /api/**            │  │  │
│  │  │              │  │  /staff/**   │  │                     │  │  │
│  │  │  ┌─────────┐ │  │  /admin/**   │  │  ┌───────────────┐  │  │
│  │  │  │ Client  │ │  └──────────────┘  │  │ Public Tickets│  │  │
│  │  │  │ Comps   │ │                    │  │ Staff API     │  │  │
│  │  │  │ (React) │ │  ┌──────────────┐  │  │ Admin API     │  │  │
│  │  │  │ Leaflet │ │  │  Auth.js v5  │  │  │ Open311 v2    │  │  │
│  │  │  │ shadcn  │ │  │  (JWT+cookie)│  │  │ Health / Media│  │  │
│  │  │  └─────────┘ │  └──────────────┘  │  └───────────────┘  │  │
│  │  └──────────────┘                    └─────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │              Data Layer (Prisma ORM)                     │  │  │
│  │  │  Prisma Client → parameterized queries → pg driver       │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                              │ DATABASE_URL                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │           PostgreSQL 16 Sidecar Container                       │ │
│  │                                                                 │ │
│  │   Tables: Ticket, Person, Category, Department, User, ...       │ │
│  │   FTS: tsvector GIN indexes (Ticket, Person)                    │ │
│  │   Geo: PostGIS extension (optional; Haversine fallback)         │ │
│  │   Media: bytea columns + pg_largeobject                         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

External:
  Browser ──── OSM Tile CDN (map tiles, no API key)
  Browser ──── Nominatim OSM API (address autocomplete, client-side)
  Third-party ─ /api/v2/** (Open311 GeoReport v2 integrators)
  K8s Platform ─ /api/health/live, /api/health/ready (probes)
```

### 1.3 Request Flow

```
Public Constituent (browser)
  │  GET / (public portal)
  ▼
Next.js App Router
  │  Server Component → Prisma query → active categories
  │  RSC renders initial HTML (map placeholder, category list)
  │  Client hydration → Leaflet map loads (dynamic import, ssr:false)
  │  User fills form → POST /api/tickets (Route Handler)
  ▼
Route Handler
  │  Zod validation → category DB lookup → Prisma transaction
  │  Creates Ticket + optional Person + optional Media
  └──► 201 { ticket_id, reference_id }

Staff User (browser)
  │  GET /staff/tickets
  ▼
Middleware (middleware.ts)
  │  auth() → decode JWT cookie → check role
  │  No session → 302 /login
  │  Has session → continue
  ▼
Server Component (staff queue page)
  │  fetch /api/staff/tickets?... (internal)
  │  Prisma: FTS + filters + pagination
  └──► Renders ticket table (SSR + client filter panel)

Open311 Client (external)
  │  GET /api/v2/requests?service_code=POTHOLE
  ▼
Route Handler (/api/v2/requests/route.ts)
  │  Rate-limit check → Prisma query → field mapping
  └──► JSON or XML response (content negotiation)
```

### 1.4 Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                  Pivota K8s Sandbox Pod                      │
│                                                              │
│  Container: ureport-app                                      │
│    Image: node:22-alpine                                     │
│    Entrypoint: node scripts/migrate-and-start.js            │
│    Port: 3000 (0.0.0.0)                                     │
│    ENV: DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, ...        │
│                                                              │
│  Container: postgres-sidecar (injected by Pivota platform)  │
│    Image: postgres:16-alpine (or postgis/postgis:16-3.4)    │
│    Port: 5432 (localhost only within pod)                   │
│    Persistent volume: /var/lib/postgresql/data              │
│                                                              │
│  Probes:                                                     │
│    Liveness:  GET /api/health/live   (period: 30s)          │
│    Readiness: GET /api/health/ready  (initial: 15s, p: 10s) │
│                                                              │
│  Declared in: infrastructure.json (repo root)               │
└─────────────────────────────────────────────────────────────┘
```

### 1.5 Startup Sequence

```
Pod Start
  ├─ 1. scripts/migrate-and-start.js begins
  ├─ 2. Wait for DB: retry SELECT 1 with exp. backoff (max 60s)
  ├─ 3. prisma migrate deploy  (idempotent; no-op if up to date)
  ├─ 4. [optional] prisma db seed  (if SEED_ON_BOOT=true)
  ├─ 5. PostGIS detection: SELECT PostGIS_Version()
  │       ├─ success → global.GEO_MODE = 'postgis'
  │       └─ failure → global.GEO_MODE = 'haversine' (log INFO)
  └─ 6. next start  → process binds 0.0.0.0:3000
         K8s readiness probe begins polling /api/health/ready
         Traffic accepted when probe returns 200
```

### 1.6 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Single Next.js process (no separate API server) | One process/one port maps cleanly to K8s single-pod model; avoids split-process complexity |
| `next.config.ts` extension (not `.js`) | Required for Next.js 15+; TypeScript config type safety |
| No `X-Frame-Options: DENY/SAMEORIGIN` | Pivota Preview embeds app in iframe — hard platform constraint |
| Bind `0.0.0.0:3000` | K8s requires non-localhost binding for pod-level health checks |
| Postgres FTS (tsvector + GIN) over Solr | Eliminates second stateful service; one sidecar model |
| PostGIS as enhancement, not hard dep | Sidecar image may lack PostGIS; Haversine fallback preserves deployability |
| Postgres bytea + Large Object for media | No ephemeral filesystem dependency; no external object store needed |
| Auth.js v5 (credentials, JWT) | Roles: public/staff/admin; no OAuth complexity for single-instance deployment |
| Leaflet dynamic import (`ssr: false`) | Avoids Next.js SSR/hydration mismatch — Leaflet accesses `window` at init |
| Zod for all request validation | Shared schema between client-side form validation and server-side route handler validation |
| CUID2 for all primary keys | Collision-resistant, URL-safe, sortable — safe to expose in URLs |

---
