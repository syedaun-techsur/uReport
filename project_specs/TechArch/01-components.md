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
