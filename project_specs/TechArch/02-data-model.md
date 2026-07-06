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
