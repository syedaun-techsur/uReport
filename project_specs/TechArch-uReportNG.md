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
---

## 2. Component Architecture

### 2.1 Directory Structure

```
UrEPORT/
├── app/                              # Next.js 15 App Router root
│   ├── (public)/                     # Route group: public-facing pages
│   │   ├── page.tsx                  # Home / public portal (F00)
│   │   ├── map/page.tsx              # Public issue map (F01)
│   │   ├── tickets/[id]/page.tsx     # Public ticket status page (F01)
│   │   └── tickets/[id]/confirm/page.tsx  # Submission confirmation (F00)
│   ├── login/page.tsx                # Login page (F02)
│   ├── staff/                        # Route group: staff-protected (middleware guard)
│   │   ├── tickets/page.tsx          # Staff ticket queue (F03)
│   │   ├── tickets/[id]/page.tsx     # Staff ticket detail (F04)
│   │   ├── people/page.tsx           # CRM people list (F05)
│   │   ├── people/[id]/page.tsx      # Person detail (F05)
│   │   ├── reports/page.tsx          # Reports dashboard (F08)
│   │   └── account/password/page.tsx # Password change (F02)
│   ├── admin/                        # Route group: admin-protected (middleware guard)
│   │   ├── categories/page.tsx       # Category management (F06a)
│   │   ├── departments/page.tsx      # Department management (F06b)
│   │   ├── substatuses/page.tsx      # Substatus management (F06c)
│   │   ├── response-templates/page.tsx  # Template management (F06d)
│   │   ├── users/page.tsx            # User account management (F06e)
│   │   └── api-keys/page.tsx         # Open311 API key management (F06f)
│   └── api/                          # Route Handlers
│       ├── auth/[...nextauth]/route.ts   # Auth.js handler
│       ├── tickets/route.ts              # POST /api/tickets
│       ├── tickets/[id]/public/route.ts  # GET public ticket
│       ├── tickets/public-map/route.ts   # GET GeoJSON public map
│       ├── categories/route.ts           # GET active categories
│       ├── media/[id]/route.ts           # GET media file
│       ├── health/live/route.ts          # GET liveness probe
│       ├── health/ready/route.ts         # GET readiness probe
│       ├── staff/
│       │   ├── tickets/route.ts          # Staff queue
│       │   ├── tickets/[id]/route.ts     # Ticket detail + PATCH
│       │   ├── tickets/bulk/route.ts     # Bulk PATCH
│       │   ├── tickets/[id]/responses/route.ts
│       │   ├── tickets/[id]/media/route.ts
│       │   ├── tickets/[id]/persons/route.ts
│       │   ├── tickets/[id]/persons/[person_id]/route.ts
│       │   ├── bookmarks/route.ts
│       │   ├── bookmarks/[id]/route.ts
│       │   ├── people/route.ts
│       │   ├── people/[id]/route.ts
│       │   ├── people/merge/route.ts
│       │   ├── people/[id]/anonymize/route.ts
│       │   ├── users/route.ts
│       │   ├── response-templates/route.ts
│       │   ├── account/password/route.ts
│       │   └── reports/
│       │       ├── volume-by-category/route.ts
│       │       ├── volume-by-department/route.ts
│       │       ├── status-breakdown/route.ts
│       │       ├── resolution-time/route.ts
│       │       ├── geo-density/route.ts
│       │       └── export/route.ts
│       ├── admin/
│       │   ├── categories/route.ts
│       │   ├── categories/[id]/route.ts
│       │   ├── departments/route.ts
│       │   ├── departments/[id]/route.ts
│       │   ├── substatuses/route.ts
│       │   ├── substatuses/[id]/route.ts
│       │   ├── substatuses/reorder/route.ts
│       │   ├── response-templates/route.ts
│       │   ├── response-templates/[id]/route.ts
│       │   ├── users/route.ts
│       │   ├── users/[id]/route.ts
│       │   ├── users/[id]/reset-password/route.ts
│       │   ├── api-keys/route.ts
│       │   └── api-keys/[id]/route.ts
│       └── v2/                           # Open311 GeoReport v2
│           ├── services/route.ts
│           ├── services/[service_code]/route.ts
│           ├── requests/route.ts
│           └── requests/[service_request_id]/route.ts
├── components/                       # Shared UI components
│   ├── ui/                           # shadcn/ui primitives (auto-generated)
│   ├── maps/                         # Leaflet wrapper components (all 'use client', ssr:false)
│   │   ├── PublicMap.tsx             # Clustered public issue map
│   │   ├── ReportingMap.tsx          # Pin-drop map for ticket submission
│   │   ├── MiniMap.tsx               # Ticket detail location preview
│   │   └── DensityMap.tsx            # Reports heat/cluster map
│   ├── tickets/                      # Ticket-related components
│   │   ├── TicketTable.tsx           # Staff queue data table
│   │   ├── FilterPanel.tsx           # Staff queue filter panel (client)
│   │   ├── StatusBadge.tsx           # Status/substatus badge
│   │   ├── HistoryTimeline.tsx       # Audit history timeline
│   │   ├── ResponseComposer.tsx      # Staff response editor
│   │   └── MediaGallery.tsx          # Media gallery/uploader
│   ├── admin/                        # Admin panel form components
│   └── layout/                       # Shell, nav, sidebar components
├── lib/                              # Server-side utilities
│   ├── prisma.ts                     # Prisma client singleton
│   ├── auth.ts                       # Auth.js config (credentials provider)
│   ├── geo.ts                        # Geo mode detection + Haversine fallback
│   ├── fts.ts                        # FTS query builder helpers
│   ├── media.ts                      # Bytea / Large Object read/write helpers
│   ├── open311.ts                    # Open311 field mapper + XML serializer
│   ├── rate-limit.ts                 # Simple in-process rate limiter
│   └── logger.ts                     # Structured JSON logger
├── schemas/                          # Shared Zod validation schemas
│   ├── ticket.ts                     # Ticket create/update schemas
│   ├── person.ts                     # Person schemas
│   ├── auth.ts                       # Login / password change schemas
│   ├── admin.ts                      # Admin CRUD schemas
│   └── open311.ts                    # Open311 request/response schemas
├── prisma/
│   ├── schema.prisma                 # Full Prisma schema
│   └── migrations/                   # Migration files (including raw SQL for FTS/PostGIS)
├── scripts/
│   ├── migrate-and-start.js          # Boot entrypoint: wait DB → migrate → seed? → start
│   └── seed.ts                       # Initial seed: admin user, sample categories, depts
├── middleware.ts                     # Auth.js route guard for /staff/** and /admin/**
├── infrastructure.json               # Pivota platform: sidecar_requirements
└── next.config.ts                    # Next.js config (TS extension required)
```

### 2.2 Backend Components

#### Prisma Data Layer (`lib/prisma.ts`)
Single Prisma Client instance (singleton pattern to prevent connection exhaustion in Next.js dev hot-reload). All database access goes through this instance.

**Responsibilities:**
- Typed query interface for all 13+ models
- Connection pooling (Prisma default pool)
- Parameterized queries only (SQL injection protection)
- Transaction support for multi-table writes (ticket create, person merge)

#### Auth.js Configuration (`lib/auth.ts`)
NextAuth v5 credentials provider. Exports the `auth()` helper used in both Route Handlers and Server Components.

**Responsibilities:**
- `authorize(username, password)` — bcrypt.compare against User table
- JWT token signing with `AUTH_SECRET`
- Session shape: `{ sub: userId, role: UserRole, username, department_id, token_version }`
- Token version check: reject JWTs where `token_version < User.token_version` (post-reset invalidation)
- Cookie: httpOnly, SameSite=Lax, Secure (in production)

#### Geo Utilities (`lib/geo.ts`)
PostGIS / Haversine mode switcher detected at startup.

**Responsibilities:**
- `detectGeoMode()` — runs `SELECT PostGIS_Version()` at startup; sets `global.GEO_MODE`
- `buildBboxFilter(bbox, mode)` — returns Prisma `$queryRaw` fragment or JS-level filter
- `distanceMeters(lat1, lng1, lat2, lng2)` — Haversine fallback implementation
- Used by: staff queue bbox filter (F03), related tickets (F04), geo density (F08), Open311 bbox (F07)

#### FTS Helpers (`lib/fts.ts`)
Full-text search query building for Postgres.

**Responsibilities:**
- `buildFtsQuery(q)` — escapes and formats input for `plainto_tsquery('english', ?)`
- `ticketFtsWhere(q)` — returns Prisma `$queryRaw` WHERE fragment for `search_vector @@ plainto_tsquery(...)`
- `personFtsWhere(q)` — same for `person_search_vector`

#### Media Utilities (`lib/media.ts`)
Postgres bytea vs. Large Object abstraction.

**Responsibilities:**
- `storeMedia(prisma, ticketId, file)` — decides bytea vs. LO based on `MEDIA_LO_THRESHOLD_KB`; creates `Media` record
- `readMedia(prisma, mediaId)` — returns `{ buffer: Buffer, mimeType, filename }` from bytea or LO
- `deleteMedia(prisma, mediaId)` — removes LO OID if applicable, deletes Media record

#### Open311 Mapper (`lib/open311.ts`)
Field translation between internal Ticket model and Open311 GeoReport v2 wire format.

**Responsibilities:**
- `ticketToServiceRequest(ticket)` — maps all Open311 fields per FRD §F07 field mapping table
- `categoryToService(category)` — maps Category to Open311 service object
- `toXml(data, rootElement)` — lightweight XML serializer (no external lib) for `<services>`, `<service_requests>`, `<errors>`
- `parseApiKey(req)` — extracts key from `api_key` query param or `X-Api-Key` header
- `verifyApiKey(prisma, rawKey, requiredScope)` — SHA-256 hash lookup + scope check + last_used_at update

#### Rate Limiter (`lib/rate-limit.ts`)
In-process sliding window rate limiter for Open311 GET endpoints.

**Responsibilities:**
- `checkRateLimit(ip, limit)` — returns `{ allowed, remaining, resetAt }`
- Uses `Map<ip, { count, windowStart }>` — resets per `OPEN311_RATE_LIMIT` requests/minute
- No Redis dependency — single-pod model means one process, shared memory

#### Structured Logger (`lib/logger.ts`)
JSON stdout logger.

**Responsibilities:**
- `log.info({ method, path, status, duration_ms, user_id?, ticket_id? })` per request
- `log.error({ message, stack })` for unhandled errors
- `LOG_LEVEL` env var controls output verbosity
- Never logs PII fields (name, email, phone)

### 2.3 Frontend Components

#### Map Components (`components/maps/`) — all `'use client'`, `dynamic(() => ..., { ssr: false })`

| Component | Used in | Purpose |
|-----------|---------|---------|
| `ReportingMap` | Public portal (F00) | Drop-pin map; address search via Nominatim |
| `PublicMap` | `/map` page (F01) | Clustered markers (leaflet.markercluster) |
| `MiniMap` | Ticket detail (F04, F01) | Read-only location pin |
| `DensityMap` | Reports dashboard (F08) | Cluster or heat layer view |

All map components use `react-leaflet` with `OpenStreetMap` tile layer. Attribution rendered by Leaflet automatically.

#### Staff Ticket Components (`components/tickets/`)

| Component | Feature | Notes |
|-----------|---------|-------|
| `TicketTable` | F03 | TanStack Table (or shadcn DataTable); row actions; checkbox for bulk |
| `FilterPanel` | F03 | Client component; URL-synced query params |
| `HistoryTimeline` | F04 | Ordered list with action-type icons (lucide) |
| `ResponseComposer` | F04 | Textarea + template picker + public/internal toggle |
| `MediaGallery` | F04 | Image grid with upload dropzone |
| `StatusBadge` | F03, F04 | Color-coded status + substatus chip |

#### Admin Components (`components/admin/`)
Drawer/dialog forms for each admin entity (Category, Department, Substatus, ResponseTemplate, User, ApiKey). Each uses react-hook-form + Zod resolver against the shared `/schemas/` validators.

---
---

## 3. Data Model

### 3.1 Entity-Relationship Diagram

```
CategoryGroup ──────< Category >──────── Department
                          │                   │
                          │                   │ (default_assignee_id)
                          ▼                   ▼
Substatus ──────────── Ticket ──────────── User
                          │            (assignee_id)
                 ┌────────┼────────┐
                 ▼        ▼        ▼
           TicketPerson  Response  Media
                 │        │
                 ▼        ▼
              Person  ResponseTemplate
                          │
               (category_id / department_id)

Ticket ──────────────── TicketHistory
                              │
                           (actor: User)

User ──────────────────── BookmarkedFilter

ApiKey  (standalone — Open311 auth)
```

**Relationship summary:**
- `Ticket` → `Category` (many-to-one)
- `Ticket` → `Department` (many-to-one, denormalized for query performance)
- `Ticket` → `Substatus` (many-to-one, nullable)
- `Ticket` → `User` as assignee (many-to-one, nullable)
- `Ticket` ↔ `Person` via `TicketPerson` (many-to-many with role)
- `Ticket` → `TicketHistory[]` (one-to-many, append-only)
- `Ticket` → `Response[]` (one-to-many)
- `Ticket` → `Media[]` (one-to-many)
- `Category` → `CategoryGroup` (many-to-one, nullable)
- `Category` → `Department` (many-to-one, nullable)
- `User` → `Department` (many-to-one, nullable — user's home dept)
- `User` → `BookmarkedFilter[]` (one-to-many)
- `ResponseTemplate` → `Category` (many-to-one, optional)
- `ResponseTemplate` → `Department` (many-to-one, optional)

### 3.2 Full Prisma Schema

```prisma
// prisma/schema.prisma
// Generated for uReport NG — PostgreSQL 16 target

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum TicketStatus {
  open
  in_progress
  closed
  archived
}

enum UserRole {
  staff
  admin
}

enum ApiScope {
  read
  write
}

// ─── CategoryGroup ─────────────────────────────────────────────────────────

model CategoryGroup {
  id         String     @id @default(cuid())
  name       String     @unique
  sort_order Int        @default(0)
  categories Category[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("CategoryGroup")
}

// ─── Category ──────────────────────────────────────────────────────────────

model Category {
  id           String  @id @default(cuid())
  service_code String  @unique
  name         String
  description  String?
  icon         String?   // lucide icon name string (e.g. "trash-2")
  color        String?   // hex color #RRGGBB
  anon_allowed Boolean @default(true)
  active       Boolean @default(true)

  group_id String?
  group    CategoryGroup? @relation(fields: [group_id], references: [id])

  department_id String?
  department    Department? @relation(fields: [department_id], references: [id])

  tickets   Ticket[]
  templates ResponseTemplate[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([active])
  @@index([service_code])
  @@index([group_id])
  @@index([department_id])
  @@map("Category")
}

// ─── Department ────────────────────────────────────────────────────────────

model Department {
  id     String  @id @default(cuid())
  name   String  @unique
  active Boolean @default(true)

  default_assignee_id String?
  default_assignee    User?   @relation("DeptDefaultAssignee", fields: [default_assignee_id], references: [id])

  categories Category[]
  tickets    Ticket[]
  templates  ResponseTemplate[]
  users      User[]             @relation("UserDepartment")

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([active])
  @@map("Department")
}

// ─── Substatus ─────────────────────────────────────────────────────────────

model Substatus {
  id             String       @id @default(cuid())
  label          String       // public-facing display label
  internal_label String?      // staff-only label
  status         TicketStatus // parent status bucket
  sort_order     Int          @default(0)
  active         Boolean      @default(true)

  tickets Ticket[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@unique([label, status])
  @@index([status, sort_order])
  @@map("Substatus")
}

// ─── User ──────────────────────────────────────────────────────────────────

model User {
  id            String   @id @default(cuid())
  username      String   @unique
  email         String   @unique
  password_hash String
  role          UserRole @default(staff)
  active        Boolean  @default(true)
  token_version Int      @default(0) // incremented on password reset to invalidate sessions

  department_id String?
  department    Department? @relation("UserDepartment", fields: [department_id], references: [id])

  assigned_tickets  Ticket[]           @relation("TicketAssignee")
  default_for_depts Department[]       @relation("DeptDefaultAssignee")
  history_entries   TicketHistory[]
  responses         Response[]
  bookmarks         BookmarkedFilter[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([active])
  @@index([department_id])
  @@map("User")
}

// ─── Ticket ────────────────────────────────────────────────────────────────
// NOTE: search_vector (tsvector) column is added via raw migration SQL below.
// It is NOT declared in Prisma schema to avoid unsupported type issues.

model Ticket {
  id           String       @id @default(cuid())
  reference_id String       @unique @default(cuid())
  service_code String       // denormalized from Category for Open311 queries
  description  String
  address      String
  lat          Float?
  lng          Float?
  status       TicketStatus @default(open)
  // search_vector: tsvector — managed by trigger (see migration SQL)

  category_id String
  category    Category @relation(fields: [category_id], references: [id])

  department_id String?
  department    Department? @relation(fields: [department_id], references: [id])

  substatus_id String?
  substatus    Substatus? @relation(fields: [substatus_id], references: [id])

  assignee_id String?
  assignee    User?   @relation("TicketAssignee", fields: [assignee_id], references: [id])

  history   TicketHistory[]
  responses Response[]
  media     Media[]
  persons   TicketPerson[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([status])
  @@index([category_id])
  @@index([department_id])
  @@index([assignee_id])
  @@index([created_at])
  @@index([updated_at])
  @@index([lat, lng])
  @@index([service_code])
  @@map("Ticket")
}

// ─── TicketPerson ──────────────────────────────────────────────────────────

model TicketPerson {
  id        String @id @default(cuid())
  ticket_id String
  ticket    Ticket @relation(fields: [ticket_id], references: [id])
  person_id String
  person    Person @relation(fields: [person_id], references: [id])
  role      String // "submitter" | "contact"

  created_at DateTime @default(now())

  @@unique([ticket_id, person_id])
  @@index([person_id])
  @@index([ticket_id])
  @@map("TicketPerson")
}

// ─── Person ────────────────────────────────────────────────────────────────
// NOTE: person_search_vector (tsvector) added via raw migration SQL below.

model Person {
  id                String    @id @default(cuid())
  name              String?
  email             String?
  phone             String?
  notes             String?
  preferred_contact String?   // "email" | "phone" | "none"
  anonymized_at     DateTime?
  merged_into_id    String?   // soft-merge: points to canonical Person id
  deleted_at        DateTime?

  tickets TicketPerson[]

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([email])
  @@index([anonymized_at])
  @@index([deleted_at])
  @@map("Person")
}

// ─── TicketHistory ─────────────────────────────────────────────────────────

model TicketHistory {
  id         String  @id @default(cuid())
  ticket_id  String
  ticket     Ticket  @relation(fields: [ticket_id], references: [id])
  actor_id   String?
  actor      User?   @relation(fields: [actor_id], references: [id])
  action     String
  // Valid action values (string enum):
  //   STATUS_CHANGE | ASSIGNMENT | RESPONSE | MEDIA_ADDED
  //   SUBSTATUS_CHANGE | PERSON_LINKED | PERSON_UNLINKED | PERSON_ANONYMIZED
  from_value String?
  to_value   String?
  note       String?

  created_at DateTime @default(now())

  @@index([ticket_id, created_at])
  @@index([actor_id])
  @@map("TicketHistory")
}

// ─── Response ──────────────────────────────────────────────────────────────

model Response {
  id          String  @id @default(cuid())
  ticket_id   String
  ticket      Ticket  @relation(fields: [ticket_id], references: [id])
  author_id   String?
  author      User?   @relation(fields: [author_id], references: [id])
  body        String
  is_public   Boolean @default(false)
  template_id String? // ResponseTemplate CUID for audit; not enforced FK

  created_at DateTime @default(now())

  @@index([ticket_id, is_public])
  @@index([ticket_id, created_at])
  @@map("Response")
}

// ─── ResponseTemplate ──────────────────────────────────────────────────────

model ResponseTemplate {
  id     String  @id @default(cuid())
  name   String  @unique
  body   String
  active Boolean @default(true)

  category_id String?
  category    Category? @relation(fields: [category_id], references: [id])

  department_id String?
  department    Department? @relation(fields: [department_id], references: [id])

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@index([active])
  @@index([category_id])
  @@index([department_id])
  @@map("ResponseTemplate")
}

// ─── Media ─────────────────────────────────────────────────────────────────

model Media {
  id         String @id @default(cuid())
  ticket_id  String
  ticket     Ticket @relation(fields: [ticket_id], references: [id])
  mime_type  String
  filename   String
  data       Bytes? // bytea for files <= MEDIA_LO_THRESHOLD_KB
  lo_oid     Int?   // Postgres Large Object OID for files > threshold
  size_bytes Int

  created_at DateTime @default(now())

  @@index([ticket_id])
  @@map("Media")
}

// ─── ApiKey ────────────────────────────────────────────────────────────────

model ApiKey {
  id           String    @id @default(cuid())
  label        String    @unique
  key_hash     String    @unique // SHA-256(plaintext_key) — plaintext never stored
  scope        ApiScope  @default(read)
  last_used_at DateTime?
  revoked_at   DateTime?

  created_at DateTime @default(now())

  @@index([key_hash])
  @@index([revoked_at])
  @@map("ApiKey")
}

// ─── BookmarkedFilter ──────────────────────────────────────────────────────

model BookmarkedFilter {
  id          String @id @default(cuid())
  user_id     String
  user        User   @relation(fields: [user_id], references: [id])
  name        String
  filter_json Json   // serialized FilterState object

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@unique([user_id, name])
  @@index([user_id])
  @@map("BookmarkedFilter")
}
```

### 3.3 Raw Migration SQL: Full-Text Search

The following SQL is added in a raw migration file alongside the Prisma-generated migration (e.g., `prisma/migrations/XXXXXX_add_fts/migration.sql`):

```sql
-- ─── Ticket FTS ──────────────────────────────────────────────────────────────

ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION ticket_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.address, '')), 'B')    ||
    setweight(to_tsvector('english', coalesce(NEW.service_code, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ticket_search_vector_trigger ON "Ticket";
CREATE TRIGGER ticket_search_vector_trigger
  BEFORE INSERT OR UPDATE OF description, address, service_code
  ON "Ticket"
  FOR EACH ROW EXECUTE FUNCTION ticket_search_vector_update();

CREATE INDEX IF NOT EXISTS ticket_search_vector_gin
  ON "Ticket" USING GIN (search_vector);

-- Backfill existing rows (safe on empty DB at first migration)
UPDATE "Ticket" SET search_vector =
  setweight(to_tsvector('english', coalesce(description, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(address, '')), 'B')     ||
  setweight(to_tsvector('english', coalesce(service_code, '')), 'C');

-- ─── Person FTS ──────────────────────────────────────────────────────────────

ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS person_search_vector tsvector;

CREATE OR REPLACE FUNCTION person_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.person_search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A')  ||
    setweight(to_tsvector('simple', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.phone, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS person_search_vector_trigger ON "Person";
CREATE TRIGGER person_search_vector_trigger
  BEFORE INSERT OR UPDATE OF name, email, phone
  ON "Person"
  FOR EACH ROW EXECUTE FUNCTION person_search_vector_update();

CREATE INDEX IF NOT EXISTS person_search_vector_gin
  ON "Person" USING GIN (person_search_vector);

UPDATE "Person" SET person_search_vector =
  setweight(to_tsvector('simple', coalesce(name, '')), 'A')  ||
  setweight(to_tsvector('simple', coalesce(email, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(phone, '')), 'C');
```

**Note on dictionary choice:**
- `'english'` dictionary for Ticket FTS: enables stemming so "potholes" matches "pothole"
- `'simple'` dictionary for Person FTS: email addresses and phone numbers don't benefit from stemming; `'simple'` avoids stripping digits

### 3.4 Raw Migration SQL: PostGIS Spatial Index

The following SQL is added in a separate migration (conditional — runs only when PostGIS is available, detected at app startup). The migration itself is always applied; the `IF EXISTS` guard prevents failure when PostGIS is absent.

```sql
-- ─── PostGIS Spatial Index (conditional) ─────────────────────────────────────
-- Applied in: prisma/migrations/XXXXXX_add_postgis/migration.sql
-- This migration is safe to run even without PostGIS installed.

DO $$
BEGIN
  -- Only proceed if PostGIS extension is available
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'postgis'
  ) THEN
    -- Add geography columns (converts lat/lng to native PostGIS type)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Ticket' AND column_name = 'geog'
    ) THEN
      ALTER TABLE "Ticket"
        ADD COLUMN geog geography(Point, 4326)
        GENERATED ALWAYS AS (
          CASE
            WHEN lat IS NOT NULL AND lng IS NOT NULL
            THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
            ELSE NULL
          END
        ) STORED;

      CREATE INDEX IF NOT EXISTS ticket_geog_gist
        ON "Ticket" USING GIST (geog);
    END IF;
  END IF;
END;
$$;

-- Backfill trigger function that keeps geog in sync (if PostGIS present)
-- Note: the generated column approach above handles this automatically.
-- The app layer checks global.GEO_MODE and uses either ST_DWithin(geog, ...) 
-- or Haversine fallback on lat/lng columns.
```

**Geo query strategy in `lib/geo.ts`:**
```typescript
// PostGIS mode: uses indexed geography column
// ST_DWithin(t.geog, ST_MakePoint(lng, lat)::geography, radiusMeters)

// Haversine mode: app-level filter after retrieving candidates by bbox
// 2 * R * asin(sqrt(sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlng/2)))
// where R = 6371000 meters
```

### 3.5 Index Summary

| Table | Column(s) | Index Type | Purpose |
|-------|-----------|------------|---------|
| `Ticket` | `search_vector` | GIN | Full-text search (FTS) |
| `Ticket` | `status` | BTree | Queue status filter |
| `Ticket` | `category_id` | BTree | Category filter |
| `Ticket` | `department_id` | BTree | Department filter |
| `Ticket` | `assignee_id` | BTree | Assignee filter |
| `Ticket` | `created_at` | BTree | Sort + date range |
| `Ticket` | `updated_at` | BTree | Sort by updated |
| `Ticket` | `lat, lng` | BTree | Bbox filter (Haversine mode) |
| `Ticket` | `service_code` | BTree | Open311 query |
| `Ticket` | `geog` | GIST | PostGIS proximity queries (optional) |
| `Person` | `person_search_vector` | GIN | Person FTS |
| `Person` | `email` | BTree | Email dedup lookup |
| `Person` | `anonymized_at` | BTree | Filter out anonymized |
| `Person` | `deleted_at` | BTree | Soft-delete filter |
| `TicketHistory` | `(ticket_id, created_at)` | BTree | Timeline fetch |
| `TicketHistory` | `actor_id` | BTree | Actor lookup |
| `Substatus` | `(status, sort_order)` | BTree | Ordered substatus UI |
| `ApiKey` | `key_hash` | BTree | O(1) auth lookup |
| `ApiKey` | `revoked_at` | BTree | Active key filter |
| `BookmarkedFilter` | `user_id` | BTree | User's saved views |
| `Category` | `active` | BTree | Active category filter |
| `Category` | `service_code` | BTree | Open311 lookup |
| `Response` | `(ticket_id, is_public)` | BTree | Public response filter |
| `ResponseTemplate` | `active` | BTree | Active template filter |

---
---

## 4. API Design

### 4.1 API Design Principles

- All endpoints are Next.js 15 App Router Route Handlers (`app/api/**/route.ts`)
- JSON is the default `Content-Type` for all non-Open311 endpoints
- Open311 endpoints support both JSON and XML via content negotiation
- All protected endpoints verify session via `auth()` from Auth.js before any business logic
- All request bodies are validated with Zod before any DB access
- Error responses follow the common envelope: `{ error: { code, message, field_errors? } }`
- Open311 error responses use the GeoReport v2 format: `{ errors: [{ code, description }] }`

### 4.2 TypeScript Interfaces

#### Core Domain Types

```typescript
// types/domain.ts

export type TicketStatus = 'open' | 'in_progress' | 'closed' | 'archived';
export type UserRole = 'staff' | 'admin';
export type ApiScope = 'read' | 'write';
export type TicketPerson_Role = 'submitter' | 'contact';

export interface TicketSummary {
  ticket_id: string;
  reference_id: string;
  category_name: string;
  department_name: string | null;
  status: TicketStatus;
  substatus_label: string | null;
  assignee_name: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface TicketDetail extends TicketSummary {
  service_code: string;
  description: string;
  category_id: string;
  department_id: string | null;
  substatus_id: string | null;
  assignee_id: string | null;
  history: TicketHistoryEntry[];
  responses: ResponseRecord[];
  media: MediaRecord[];
  persons: TicketPersonRecord[];
}

export interface TicketHistoryEntry {
  id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface ResponseRecord {
  id: string;
  body: string;
  is_public: boolean;
  author_name: string | null;
  template_id: string | null;
  created_at: string;
}

export interface MediaRecord {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface TicketPersonRecord {
  person_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: TicketPerson_Role;
}

export interface PersonRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  preferred_contact: string | null;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonDetail extends PersonRecord {
  linked_tickets: TicketSummary[];
}

export interface CategoryRecord {
  id: string;
  service_code: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  anon_allowed: boolean;
  active: boolean;
  group_id: string | null;
  department_id: string | null;
  department_name: string | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    field_errors?: Record<string, string>;
  };
}
```

#### Request/Response Zod Schemas

```typescript
// schemas/ticket.ts
import { z } from 'zod';

export const CreateTicketSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(5).max(500),
  category_id: z.string().cuid(),
  description: z.string().min(10).max(4000),
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
});

export const UpdateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'closed', 'archived']).optional(),
  substatus_id: z.string().cuid().nullable().optional(),
  assignee_id: z.string().cuid().nullable().optional(),
  note: z.string().max(4000).optional(),
});

export const BulkUpdateSchema = z.object({
  ticket_ids: z.array(z.string().cuid()).min(1).max(100),
  action: z.enum(['status', 'assign']),
  value: z.string().min(1),
});

export const TicketQueueQuerySchema = z.object({
  q: z.string().max(500).optional(),
  category_id: z.string().cuid().optional(),
  department_id: z.string().cuid().optional(),
  status: z.enum(['open', 'in_progress', 'closed', 'archived']).optional(),
  substatus_id: z.string().cuid().optional(),
  assignee_id: z.string().cuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional(),
  sort: z.enum(['created_at', 'updated_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(10).max(100).default(25),
});

// schemas/auth.ts
export const LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const PasswordChangeSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(12).max(200).regex(/[A-Z]/).regex(/[0-9]/),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

// schemas/open311.ts
export const Open311PostRequestSchema = z.object({
  service_code: z.string().min(1).max(50),
  lat: z.coerce.number().min(-90).max(90).optional(),
  long: z.coerce.number().min(-180).max(180).optional(),
  address_string: z.string().max(500).optional(),
  description: z.string().min(10).max(4000),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  api_key: z.string().optional(),
}).refine(d => d.lat !== undefined || d.address_string, {
  message: 'lat/long or address_string required',
});
```

### 4.3 API Route Structure

#### Public Endpoints

| Method | Path | Auth | Feature | Response |
|--------|------|------|---------|---------|
| `POST` | `/api/tickets` | [PUBLIC] | F00 | `201 { ticket_id, reference_id, status, category_name, created_at }` |
| `GET` | `/api/tickets/[id]/public` | [PUBLIC] | F01 | `200 PublicTicketResponse` |
| `GET` | `/api/tickets/public-map` | [PUBLIC] | F01 | `200 GeoJSON FeatureCollection` |
| `GET` | `/api/categories` | [PUBLIC] | F00 | `200 CategoryRecord[]` |
| `GET` | `/api/media/[id]` | [PUBLIC/STAFF] | F09 | `200 binary stream` |
| `GET` | `/api/health/live` | [PUBLIC] | F09 | `200 { status: "ok" }` |
| `GET` | `/api/health/ready` | [PUBLIC] | F09 | `200 { status: "ready" }` |
| `POST` | `/api/auth/[...nextauth]` | [PUBLIC] | F02 | Auth.js handler |

#### Staff Ticket Endpoints — `[AUTH: staff]`

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/staff/tickets` | F03 | Filtered/paginated ticket queue |
| `GET` | `/api/staff/tickets/[id]` | F04 | Full ticket detail with relations |
| `PATCH` | `/api/staff/tickets/[id]` | F04 | Update status, substatus, assignee |
| `PATCH` | `/api/staff/tickets/bulk` | F03 | Bulk status/assign update |
| `GET` | `/api/staff/tickets/[id]/responses` | F04 | List all responses |
| `POST` | `/api/staff/tickets/[id]/responses` | F04 | Add response/note |
| `POST` | `/api/staff/tickets/[id]/media` | F04 | Upload media attachment |
| `POST` | `/api/staff/tickets/[id]/persons` | F05 | Link person to ticket |
| `DELETE` | `/api/staff/tickets/[id]/persons/[person_id]` | F05 | Unlink person |

#### Staff Bookmark Endpoints — `[AUTH: staff]`

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/staff/bookmarks` | F03 | List current user's bookmarks |
| `POST` | `/api/staff/bookmarks` | F03 | Create bookmark |
| `GET` | `/api/staff/bookmarks/[id]` | F03 | Get single bookmark |
| `PATCH` | `/api/staff/bookmarks/[id]` | F03 | Update bookmark |
| `DELETE` | `/api/staff/bookmarks/[id]` | F03 | Delete bookmark |

#### Staff Utility Endpoints — `[AUTH: staff]`

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/staff/users` | F04 | Staff user typeahead (`?q=`) |
| `GET` | `/api/staff/response-templates` | F04 | List active templates |
| `POST` | `/api/staff/account/password` | F02 | Self-service password change |

#### Staff CRM Endpoints — `[AUTH: staff]`

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/staff/people` | F05 | Person search (`?q=`) |
| `GET` | `/api/staff/people/[id]` | F05 | Person detail + linked tickets |
| `PATCH` | `/api/staff/people/[id]` | F05 | Update person fields |
| `POST` | `/api/staff/people/merge` | F05 | Merge two person records |
| `PATCH` | `/api/staff/people/[id]/anonymize` | F05 | Anonymize person (GDPR) |

#### Staff Reports Endpoints — `[AUTH: staff]`

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/staff/reports/volume-by-category` | F08 | Time-series ticket volume |
| `GET` | `/api/staff/reports/volume-by-department` | F08 | Time-series by department |
| `GET` | `/api/staff/reports/status-breakdown` | F08 | Open/closed counts |
| `GET` | `/api/staff/reports/resolution-time` | F08 | Mean/median close time |
| `GET` | `/api/staff/reports/geo-density` | F08 | GeoJSON for density map |
| `GET` | `/api/staff/reports/export` | F08 | CSV export (streaming) |

#### Admin Endpoints — `[AUTH: admin]`

| Method | Path | Feature | Description |
|--------|------|---------|-------------|
| `GET` | `/api/admin/categories` | F06a | List all categories |
| `POST` | `/api/admin/categories` | F06a | Create category |
| `PATCH` | `/api/admin/categories/[id]` | F06a | Update / deactivate category |
| `GET` | `/api/admin/departments` | F06b | List all departments |
| `POST` | `/api/admin/departments` | F06b | Create department |
| `PATCH` | `/api/admin/departments/[id]` | F06b | Update department |
| `GET` | `/api/admin/substatuses` | F06c | List substatuses |
| `POST` | `/api/admin/substatuses` | F06c | Create substatus |
| `PATCH` | `/api/admin/substatuses/[id]` | F06c | Update substatus |
| `PATCH` | `/api/admin/substatuses/reorder` | F06c | Batch reorder |
| `GET` | `/api/admin/response-templates` | F06d | List templates |
| `POST` | `/api/admin/response-templates` | F06d | Create template |
| `PATCH` | `/api/admin/response-templates/[id]` | F06d | Update template |
| `GET` | `/api/admin/users` | F06e | List users |
| `POST` | `/api/admin/users` | F06e | Create user |
| `PATCH` | `/api/admin/users/[id]` | F06e | Update / deactivate user |
| `POST` | `/api/admin/users/[id]/reset-password` | F06e | Admin-initiated password reset |
| `GET` | `/api/admin/api-keys` | F06f | List API keys |
| `POST` | `/api/admin/api-keys` | F06f | Generate API key |
| `PATCH` | `/api/admin/api-keys/[id]` | F06f | Revoke API key |

#### Open311 GeoReport v2 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v2/services` | [PUBLIC] | List active services (JSON/XML) |
| `GET` | `/api/v2/services/[service_code]` | [PUBLIC] | Service definition + attributes |
| `POST` | `/api/v2/requests` | [api-key write] | Submit service request |
| `GET` | `/api/v2/requests` | [PUBLIC + rate limit] | Query requests (paginated) |
| `GET` | `/api/v2/requests/[service_request_id]` | [PUBLIC + rate limit] | Single request detail |

### 4.4 Open311 Field Mapping Types

```typescript
// types/open311.ts

export interface Open311Service {
  service_code: string;
  service_name: string;
  description: string;
  metadata: false;
  type: 'realtime';
  keywords: string;
  group: string;
}

export interface Open311ServiceRequest {
  service_request_id: string;
  status: 'open' | 'closed';
  status_notes: string | null;
  service_name: string;
  service_code: string;
  description: string;
  agency_responsible: string | null;
  service_notice: null;
  requested_datetime: string;   // ISO8601 UTC
  updated_datetime: string;     // ISO8601 UTC
  expected_datetime: null;
  address: string;
  address_id: null;
  zipcode: null;
  lat: number | null;
  long: number | null;          // NOTE: Open311 uses 'long', not 'lng'
  media_url: null;
}

export interface Open311Error {
  errors: Array<{
    code: string;
    description: string;
  }>;
}

// Internal → Open311 status mapping:
// 'open'       → 'open'
// 'in_progress' → 'open'
// 'closed'     → 'closed'
// 'archived'   → 'closed'
```

### 4.5 Session / Auth Types

```typescript
// types/auth.ts — extends NextAuth session types

import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: 'staff' | 'admin';
      department_id: string | null;
      token_version: number;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    username: string;
    role: 'staff' | 'admin';
    department_id: string | null;
    token_version: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: 'staff' | 'admin';
    department_id: string | null;
    token_version: number;
  }
}
```

### 4.6 Common Response Patterns

```typescript
// lib/api-response.ts

import { NextResponse } from 'next/server';

// Standard success response
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// Standard error response
export function apiError(
  code: string,
  message: string,
  status: number,
  fieldErrors?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(fieldErrors ? { field_errors: fieldErrors } : {}) } },
    { status }
  );
}

// Open311 error format
export function open311Error(
  code: string,
  description: string,
  status: number,
  format: 'json' | 'xml' = 'json'
): NextResponse {
  const body = { errors: [{ code, description }] };
  if (format === 'xml') {
    return new NextResponse(toXml(body, 'errors'), {
      status,
      headers: { 'Content-Type': 'application/xml' }
    });
  }
  return NextResponse.json(body, { status });
}

// Auth guard helper — used in route handlers
export async function requireSession(
  role: 'staff' | 'admin' = 'staff'
): Promise<Session | NextResponse> {
  const session = await auth();
  if (!session) return apiError('UNAUTHORIZED', 'Authentication required', 401);
  if (role === 'admin' && session.user.role !== 'admin') {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }
  return session;
}
```

---
---

## 5. Security Architecture

### 5.1 Authentication

**Provider:** Auth.js v5 (NextAuth) with Credentials provider. No OAuth/social login in v1.

**Flow:**
```
POST /api/auth/[...nextauth] (login)
  │
  ├─ Extract username + password from form body
  ├─ authorizeUser(username, password):
  │     SELECT * FROM "User" WHERE lower(username) = lower($1) AND active = true
  │     bcrypt.compare(submitted_password, user.password_hash)
  │     Return { id, email, username, role, department_id, token_version } on success
  │     Return null on failure (Auth.js treats null as auth failed)
  │
  ├─ On success: Auth.js generates JWT with:
  │     { sub: user.id, role, username, department_id, token_version, exp: now + AUTH_SESSION_TTL }
  │
  └─ Cookie: __Secure-next-auth.session-token
       httpOnly: true
       SameSite: Lax
       Secure: true (production), false (dev with HTTP)
       Path: /
       MaxAge: AUTH_SESSION_TTL (default: 28800 = 8 hours)
```

**Token Version Invalidation:**
```
Admin-initiated password reset:
  UPDATE "User" SET token_version = token_version + 1 WHERE id = $1

On every protected request:
  auth() → decode JWT → JWT.token_version < User.token_version → reject (401)
```

### 5.2 Authorization Model

#### Role Hierarchy

```
public (unauthenticated)
  └── Can access: /, /map, /tickets/[id], /api/tickets (POST), /api/categories, /api/v2/**, /api/health/**, /api/media/[id]*

staff
  └── Can access: all public routes + /staff/** (pages and /api/staff/**)
  └── Cannot access: /admin/** routes

admin
  └── Can access: all staff routes + /admin/** (pages and /api/admin/**)
  └── Special permissions: re-open closed tickets, unlink submitter persons
```

#### Route Guard (middleware.ts)

```typescript
// middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Guard /staff/** and /admin/**
  if (pathname.startsWith('/staff/') || pathname.startsWith('/admin/')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Staff trying to access admin routes
    if (pathname.startsWith('/admin/') && session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/staff/tickets', req.url));
    }
  }

  // Guard /api/staff/** and /api/admin/** (Route Handlers check independently too)
  if (pathname.startsWith('/api/staff/') || pathname.startsWith('/api/admin/')) {
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }
    if (pathname.startsWith('/api/admin/') && session.user.role !== 'admin') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
    }
  }
});

export const config = {
  matcher: ['/staff/:path*', '/admin/:path*', '/api/staff/:path*', '/api/admin/:path*'],
};
```

#### Open311 API Key Authentication

```typescript
// lib/open311.ts — API key verification
import crypto from 'crypto';

export async function verifyApiKey(
  prisma: PrismaClient,
  rawKey: string,
  requiredScope: 'read' | 'write'
): Promise<{ valid: boolean; error?: string }> {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  
  const apiKey = await prisma.apiKey.findUnique({ where: { key_hash: keyHash } });
  
  if (!apiKey) return { valid: false, error: 'key_not_found' };
  if (apiKey.revoked_at !== null) return { valid: false, error: 'key_not_found' };
  if (requiredScope === 'write' && apiKey.scope !== 'write') {
    return { valid: false, error: 'key_read_only' };
  }
  
  // Update last_used_at (fire-and-forget, don't await)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { last_used_at: new Date() }
  }).catch(() => {});
  
  return { valid: true };
}
```

### 5.3 Data Protection

#### Password Storage
- bcrypt hash with work factor **12** (`bcrypt.hash(password, 12)`)
- Work factor 12 ≈ 250ms on a modern server — sufficient to resist brute force
- Passwords **never** logged, never returned in API responses, never stored in plaintext

#### API Key Storage
- Plaintext key generated as 32 bytes of cryptographically random hex (64 chars)
- Only SHA-256 hash stored in `ApiKey.key_hash`
- Plaintext shown **once** in admin UI modal; never retrievable again
- Key validation: `SHA-256(submitted_key) === stored_hash` — O(1) with BTree index

#### SQL Injection Prevention
- **All** database access via Prisma ORM parameterized queries
- Raw SQL (FTS, geo queries) uses `prisma.$queryRaw` with tagged template literals — parameters are automatically escaped
- No string concatenation in SQL fragments

#### PII Protection
- `Person` records (name, email, phone) visible only to `staff` and `admin` roles
- Anonymization: nulls all PII fields, sets `anonymized_at` — irreversible
- Structured logs **must not** contain name, email, phone fields (enforced by logger interface)
- Public ticket endpoints filter out contact information entirely

#### Session Security
```
Cookie flags:
  httpOnly: true          → XSS cannot access token
  SameSite: Lax           → CSRF protection for cross-site navigation
  Secure: true (prod)     → HTTPS-only transmission
  Path: /                 → Available to full app
  
JWT claims:
  exp: now + AUTH_SESSION_TTL   → Short-lived (default 8h)
  token_version: N              → Allows invalidation on password reset
```

### 5.4 Transport Security

| Layer | Requirement |
|-------|-------------|
| HTTPS | Enforced at K8s ingress layer (outside app scope) |
| HSTS | Handled by K8s ingress / Pivota platform |
| X-Frame-Options | **NOT emitted** — Pivota Preview embeds app in iframe |
| CSP frame-ancestors | **NOT set to 'none' or 'self'** — iframe requirement |
| Content-Type | All API responses include correct Content-Type |
| X-Content-Type-Options | `nosniff` — set in `next.config.ts` headers |

```typescript
// next.config.ts — security headers
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // NOTE: No X-Frame-Options — Pivota embeds this app in an iframe
  // NOTE: No frame-ancestors in CSP — same reason
];
```

### 5.5 Rate Limiting

Rate limiting applies **only** to Open311 public GET endpoints to prevent scraping abuse.

```
OPEN311_RATE_LIMIT env var (default: 60 req/min per IP)

Algorithm: sliding window per IP address
  - In-process Map<ip, { count, windowStart }>
  - windowStart = current minute boundary (Math.floor(Date.now() / 60000))
  - If count >= limit: return 429 with Retry-After header
  - Single-pod model: no Redis needed; state is per-process

Response headers on rate-limited response:
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 0
  Retry-After: <seconds until window reset>
```

Staff and admin endpoints are not rate-limited (Auth.js session required).

### 5.6 Input Validation

All inputs validated with **Zod** before any database access:

```
Request lifecycle:
  1. Parse request body / query params
  2. Zod schema.safeParse(input)
  3. On failure → 422 VALIDATION_ERROR with field_errors
  4. On success → extract typed data → DB operation

Additional runtime checks (after Zod):
  - category_id exists and is active (F00 submission)
  - substatus belongs to correct parent status (F04 update)
  - assignee is an active user (F04 assignment)
  - Merge: source ≠ target, neither anonymized (F05)
  - Admin: no self-deactivation (F06e)
```

### 5.7 Security Error Handling Principles

1. **No enumeration:** Login errors always return "Invalid username or password" regardless of whether username exists
2. **No stack traces to clients:** 500 errors return generic message; full stack written to structured logs only
3. **No PII in error messages:** `field_errors` keys may name fields but values must not echo user-submitted PII
4. **Consistent timing:** Auth uses bcrypt which is inherently slow; no timing oracle attack possible
5. **No secrets in logs:** `AUTH_SECRET`, `DATABASE_URL`, `key_hash` values never written to stdout

---
---

## 6. Technology Stack

### 6.1 Core Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | `^15.0.0` | Full-stack App Router; single process port 3000 |
| **Runtime** | Node.js | `22.x` | Server runtime (Alpine-based image) |
| **Language** | TypeScript | `^5.x` | Strict mode throughout; `next.config.ts` required |
| **UI Library** | React | `^19.0.0` | Server + Client components (App Router) |
| **Database** | PostgreSQL | `16` | Primary data store (sidecar) |
| **ORM** | Prisma | `^6.x` | Type-safe DB access; `prisma migrate deploy` at boot |
| **Auth** | Auth.js (NextAuth) | `^5.x` | Credentials provider; JWT sessions |
| **Validation** | Zod | `^3.x` | Shared client+server request/response validation |
| **Password Hashing** | bcryptjs | `^2.x` | bcrypt work factor 12 |

### 6.2 Frontend Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **UI Components** | shadcn/ui | latest | Accessible, unstyled-first component library |
| **Styling** | Tailwind CSS | `^4.x` | Utility-first CSS; light/dark mode with `system` default |
| **Icons** | lucide-react | `^0.4x` | Icon set for UI actions and category icons |
| **Maps** | Leaflet | `^1.9.x` | Interactive map rendering |
| **React Maps** | react-leaflet | `^4.x` | React wrapper for Leaflet; requires `ssr: false` |
| **Map Clustering** | leaflet.markercluster | `^1.5.x` | Public map + staff queue map view clustering |
| **Charts** | Recharts | `^2.x` | Reports dashboard charts (bar, line, donut) |
| **Forms** | react-hook-form | `^7.x` | Form state management + Zod resolver |
| **Data Tables** | @tanstack/react-table | `^8.x` | Staff queue table (sort, filter, paginate) |

### 6.3 Testing Stack

| Tool | Version | Scope |
|------|---------|-------|
| **Vitest** | `^2.x` | Unit tests — data utilities, API handlers, schemas |
| **@testing-library/react** | `^16.x` | React component unit tests |
| **Playwright** | `^1.4x` | E2e tests — constituent portal, staff queue, login |
| **axe-core / @axe-core/playwright** | `^4.x` | Automated WCAG accessibility scan in e2e |

**Testing constraints:**
- No `testcontainers`, no `docker run` in test suite
- Unit tests run against mocked Prisma client (vitest mocks)
- E2e tests run against the running sidecar DB (already provisioned in Pivota sandbox)
- Open311 contract tests (Vitest): verify exact field name compliance per GeoReport v2 spec

### 6.4 Infrastructure & Ops

| Tool | Version | Purpose |
|------|---------|---------|
| **Prisma CLI** | `^6.x` | Migration management (`prisma migrate deploy` at boot) |
| **Node.js crypto** | built-in | SHA-256 for API key hashing (no external dep) |
| **pg** | `^8.x` | Node Postgres driver (used by Prisma internally; also direct for LO API) |

### 6.5 Package.json Key Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "prisma generate && next build",
    "start": "node scripts/migrate-and-start.js",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test --project=accessibility",
    "type-check": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

### 6.6 next.config.ts

```typescript
// next.config.ts  (MUST use .ts extension with Next.js 15+)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow Pivota Preview to embed this app in an iframe
  // DO NOT add X-Frame-Options or frame-ancestors CSP here
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // NOTE: Intentionally no X-Frame-Options header
          // NOTE: Intentionally no Content-Security-Policy frame-ancestors
        ],
      },
    ];
  },
  // Leaflet requires browser globals — ensure Leaflet deps don't break SSR
  serverExternalPackages: [],
};

export default nextConfig;
```

### 6.7 Infrastructure.json

```json
{
  "sidecar_requirements": ["postgres"],
  "port": 3000
}
```

### 6.8 Environment Variables Specification

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | **Required** | — | Prisma/pg connection string: `postgresql://user:pass@localhost:5432/ureport` |
| `AUTH_SECRET` | **Required** | — | Auth.js JWT signing secret (≥32 random chars). App exits if missing. |
| `NEXTAUTH_URL` | **Required (prod)** | — | Canonical URL for Auth.js redirects: `https://app.pivota.dev` |
| `AUTH_SESSION_TTL` | Optional | `28800` | Session TTL in seconds (default 8 hours) |
| `CITY_CENTER_LAT` | Optional | `39.165325` | Default map center latitude (Bloomington, IN) |
| `CITY_CENTER_LNG` | Optional | `-86.526384` | Default map center longitude |
| `CITY_BBOX_MINLAT` | Optional | — | City bounding box minimum latitude |
| `CITY_BBOX_MINLNG` | Optional | — | City bounding box minimum longitude |
| `CITY_BBOX_MAXLAT` | Optional | — | City bounding box maximum latitude |
| `CITY_BBOX_MAXLNG` | Optional | — | City bounding box maximum longitude |
| `OPEN311_RATE_LIMIT` | Optional | `60` | Max Open311 GET requests per minute per IP |
| `MEDIA_MAX_SIZE_MB` | Optional | `10` | Maximum upload file size in MB |
| `MEDIA_LO_THRESHOLD_KB` | Optional | `8` | File size threshold for bytea vs. Large Object (KB) |
| `SEED_ON_BOOT` | Optional | `false` | Run seed script on pod startup (`true`/`false`) |
| `LOG_LEVEL` | Optional | `info` | Logging verbosity: `debug`\|`info`\|`warn`\|`error` |
| `PIVOTA_DB_MODE` | Optional | — | Set to `sidecar-postgres` by Pivota platform |
| `TZ` | Optional | `America/Indiana/Indianapolis` | Server timezone for date display |
| `NODE_ENV` | Auto-set | — | `production` in built image; `development` in dev |

**Startup validation** (`scripts/migrate-and-start.js`):
```javascript
const required = ['DATABASE_URL', 'AUTH_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
```

### 6.9 Migrate-and-Start Script

```javascript
// scripts/migrate-and-start.js
const { execSync, spawn } = require('child_process');
const { Client } = require('pg');

const MAX_RETRIES = 12;
const RETRY_DELAY_BASE_MS = 2000;

async function waitForDb() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('[INFO] Database connection established.');
      return;
    } catch (err) {
      const delay = RETRY_DELAY_BASE_MS * Math.pow(1.5, i);
      console.log(`[INFO] Waiting for DB... retry ${i + 1}/${MAX_RETRIES} (${Math.round(delay)}ms)`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('[FATAL] Could not connect to database after max retries.');
  process.exit(1);
}

async function main() {
  // 1. Validate required env vars
  for (const key of ['DATABASE_URL', 'AUTH_SECRET']) {
    if (!process.env[key]) { console.error(`[FATAL] Missing: ${key}`); process.exit(1); }
  }

  // 2. Wait for DB
  await waitForDb();

  // 3. Run migrations (idempotent)
  console.log('[INFO] Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('[INFO] Migrations complete.');

  // 4. Optional seed
  if (process.env.SEED_ON_BOOT === 'true') {
    console.log('[INFO] Running seed script...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  }

  // 5. Start Next.js
  console.log('[INFO] Starting Next.js server...');
  const next = spawn('npx', ['next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    env: process.env,
  });
  next.on('exit', (code) => process.exit(code ?? 1));
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
```

---
---

## 7. Integration Points

### 7.1 PostgreSQL 16 Sidecar (Required)

**Type:** Server-side hard dependency  
**Connection:** `DATABASE_URL` environment variable  
**Protocol:** Postgres wire protocol via Prisma ORM + `pg` driver

**Capabilities used:**
- Standard relational tables (Prisma ORM)
- Full-Text Search (`tsvector` columns + GIN indexes + `plainto_tsquery`)
- Large Object API (`pg_largeobject`) for media > `MEDIA_LO_THRESHOLD_KB`
- `bytea` columns for small media
- JSON/JSONB column (`filter_json` in `BookmarkedFilter`)

**PostGIS (optional extension):**
```
Detection query at startup:
  SELECT PostGIS_Version()
  
If present: global.GEO_MODE = 'postgis'
  → Uses: ST_DWithin(geog, ST_MakePoint(lng,lat)::geography, meters)
  → Uses: ST_Distance, ST_Within
  
If absent: global.GEO_MODE = 'haversine'
  → Falls back to: JavaScript Haversine formula on lat/lng values
  → No startup failure; geo features degrade gracefully (not disabled)
```

**Affected queries when PostGIS unavailable:**
- Staff queue bbox filter — falls back to `lat BETWEEN` / `lng BETWEEN` (approximate)
- Related tickets proximity (F04) — Haversine filter in app layer
- Geographic density map (F08) — returns all tickets; client-side clustering
- Open311 GET requests bbox — `lat`/`lng` range filter

**Failure behavior:** If DB is unreachable, `/api/health/ready` returns `503`. K8s readiness probe blocks traffic until DB connection succeeds. Application does not serve requests until readiness passes.

### 7.2 Auth.js v5 (Server-side Library)

**Type:** npm package (no external network call)  
**Config file:** `lib/auth.ts`

```typescript
// lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        const user = await prisma.user.findFirst({
          where: {
            username: { equals: String(credentials.username), mode: 'insensitive' },
            active: true,
          },
        });
        
        if (!user) return null;
        
        const passwordMatch = await bcrypt.compare(
          String(credentials.password),
          user.password_hash
        );
        
        if (!passwordMatch) return null;
        
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          department_id: user.department_id,
          token_version: user.token_version,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.department_id = (user as any).department_id;
        token.token_version = (user as any).token_version;
      }
      return token;
    },
    async session({ session, token }) {
      // Verify token_version hasn't been incremented (password reset)
      const dbUser = await prisma.user.findUnique({
        where: { id: String(token.id) },
        select: { token_version: true, active: true },
      });
      
      if (!dbUser || !dbUser.active || dbUser.token_version > Number(token.token_version)) {
        // Return empty session — triggers re-auth
        return { ...session, user: undefined } as any;
      }
      
      session.user = {
        ...session.user,
        id: String(token.id),
        username: String(token.username),
        role: token.role as any,
        department_id: token.department_id as string | null,
        token_version: Number(token.token_version),
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.AUTH_SESSION_TTL ?? '28800'),
  },
});
```

**Failure mode:** If `AUTH_SECRET` is not set, Auth.js throws a configuration error at startup — process exits. This is intentional (security requirement).

### 7.3 OpenStreetMap / Nominatim (Client-Side Geocoding)

**Type:** Client-side browser HTTP fetch (no server-side proxy)  
**No API key required**

**Endpoints:**
- Address search: `GET https://nominatim.openstreetmap.org/search?q={query}&format=json&countrycodes=us&limit=5`
- Reverse geocode: `GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json`

**Rate limit compliance:** Debounce input 300ms before sending requests. Nominatim policy: max 1 req/sec per user.

**Failure behavior:** If Nominatim is unreachable, the address search input shows "Address search unavailable" and user falls back to map pin placement. Ticket submission continues normally. Error code: `GEOCODE_UNAVAILABLE` (warning only, non-blocking).

### 7.4 OpenStreetMap Tile Server (Client-Side Map Tiles)

**Type:** Client-side Leaflet tile layer  
**No API key required**  
**Tile URL:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

**Attribution requirement (OSM policy):** Leaflet renders the OSM attribution layer automatically — no code required beyond using Leaflet's default attribution.

**Failure behavior:** If OSM tiles are unreachable, the map renders with a grey background. All app functionality (ticket submission, list views) is unaffected.

### 7.5 Open311 GeoReport v2 External Clients

**Type:** Inbound HTTP clients (third-party integrators)  
**Paths:** `/api/v2/**`

**Backward compatibility contract:**
- Field names match GeoReport v2 specification exactly (see §4.4 for mapping)
- `service_request_id`, `long` (not `lng`), `requested_datetime` (not `created_at`), etc.
- JSON default; XML via `?format=xml` or `Accept: application/xml`
- Open311 error format: `{ errors: [{ code, description }] }` (not the internal error envelope)
- Any field name or structure change requires a version bump

**XML serialization (no external library):**
```typescript
// lib/open311.ts — lightweight XML builder
export function toXml(obj: Record<string, any>, rootTag: string): string {
  const inner = Object.entries(obj).map(([key, val]) => {
    if (Array.isArray(val)) {
      return val.map(item => `<${key}>${objToXmlInner(item)}</${key}>`).join('');
    }
    return `<${key}>${escapeXml(String(val ?? ''))}</${key}>`;
  }).join('');
  return `<?xml version="1.0" encoding="utf-8"?><${rootTag}>${inner}</${rootTag}>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

### 7.6 Pivota Kubernetes Platform

**Type:** Deployment runtime  
**Contract:** `infrastructure.json` in repo root

```json
{
  "sidecar_requirements": ["postgres"],
  "port": 3000
}
```

**Platform-injected env vars:**
- `DATABASE_URL` — Postgres sidecar connection string
- `PIVOTA_DB_MODE=sidecar-postgres`

**K8s probe configuration:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  periodSeconds: 30
  timeoutSeconds: 2
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Health endpoint implementations:**

```typescript
// app/api/health/live/route.ts
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}

// app/api/health/ready/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ready',
      db: 'connected',
      migrations: 'applied',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'not_ready', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
```

**CSP/Framing constraint:** The app must NOT emit `X-Frame-Options: DENY/SAMEORIGIN` or CSP `frame-ancestors 'none'/'self'` because Pivota Preview renders the app inside an `<iframe>`. This is enforced in `next.config.ts` by explicitly not setting those headers.

### 7.7 Leaflet + react-leaflet (Bundled Client Library)

**Type:** npm package — no external service call  
**SSR constraint:** All Leaflet components must be dynamically imported with `{ ssr: false }`:

```typescript
// Example: app/(public)/map/page.tsx
import dynamic from 'next/dynamic';

const PublicMap = dynamic(
  () => import('@/components/maps/PublicMap'),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" aria-label="Loading map..." />
  }
);
```

**Rationale:** Leaflet calls `document` and `window` during initialization. Next.js SSR doesn't have these globals, causing hydration mismatches and build errors without `ssr: false`.

**Clustering:** `leaflet.markercluster` — MIT license. Used in `PublicMap` (F01) and staff queue map view (F03).

### 7.8 Integration Dependency Summary

| Integration | Type | Required | Graceful Degradation |
|-------------|------|----------|---------------------|
| PostgreSQL 16 (sidecar) | Server-side | **Yes** — hard dep | Readiness probe blocks traffic until available |
| PostGIS extension | Server-side | No — optional | Haversine fallback; geo queries still work |
| Auth.js v5 | Server library | **Yes** | App exits if `AUTH_SECRET` missing |
| Nominatim / OSM Geocoding | Client-side HTTP | No | "Address search unavailable" warning; submission unaffected |
| OSM Tile Server | Client-side tiles | No | Grey map background; app fully functional |
| Open311 external clients | Inbound HTTP | No — external dep | They receive errors on app down; no app-side degradation |
| Pivota K8s platform | Deployment | **Yes** | N/A — platform provides the runtime |
| Leaflet (npm) | Client library | **Yes** (for maps) | Bundled; no external network; map views non-functional if JS disabled |

---
