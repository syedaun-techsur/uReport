
---

## Y0: Database Schema (Prisma DDL)

All entities use `String @id @default(cuid())` as primary key unless noted. Timestamps use `DateTime @default(now())` / `@updatedAt`. Soft-delete is via `active Boolean @default(true)` or `deleted_at DateTime?`. Full-text search uses a raw SQL `tsvector` column managed by a Postgres trigger (not directly in Prisma schema; added via migration SQL).

---

### Y0.1: Ticket

```prisma
model Ticket {
  id           String    @id @default(cuid())
  reference_id String    @unique @default(cuid()) // Human-readable reference, shorter CUID
  service_code String    // denormalized from Category for Open311 queries
  description  String
  address      String
  lat          Float?
  lng          Float?
  status       TicketStatus  @default(open)
  // search_vector is a tsvector column added via raw migration SQL (GIN index)
  // search_vector Unsupported("tsvector")? // managed by trigger

  category_id  String
  category     Category      @relation(fields: [category_id], references: [id])

  department_id String?
  department    Department?   @relation(fields: [department_id], references: [id])

  substatus_id  String?
  substatus     Substatus?    @relation(fields: [substatus_id], references: [id])

  assignee_id   String?
  assignee      User?         @relation("TicketAssignee", fields: [assignee_id], references: [id])

  history       TicketHistory[]
  responses     Response[]
  media         Media[]
  persons       TicketPerson[]

  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  @@index([status])
  @@index([category_id])
  @@index([department_id])
  @@index([assignee_id])
  @@index([created_at])
  @@index([lat, lng])
}

enum TicketStatus {
  open
  in_progress
  closed
  archived
}
```

*Raw migration SQL (added alongside Prisma migration):*
```sql
ALTER TABLE "Ticket" ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION ticket_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.address, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_search_vector_trigger
BEFORE INSERT OR UPDATE ON "Ticket"
FOR EACH ROW EXECUTE FUNCTION ticket_search_vector_update();

CREATE INDEX ticket_search_vector_gin ON "Ticket" USING GIN (search_vector);
```

---

### Y0.2: Person

```prisma
model Person {
  id                  String    @id @default(cuid())
  name                String?
  email               String?
  phone               String?
  notes               String?
  preferred_contact   String?   // "email" | "phone" | "none"
  anonymized_at       DateTime?
  merged_into_id      String?
  deleted_at          DateTime?

  tickets             TicketPerson[]

  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt

  @@index([email])
  // person_search_vector tsvector (added via raw SQL, same pattern as Ticket)
}
```

*Person FTS migration:*
```sql
ALTER TABLE "Person" ADD COLUMN person_search_vector tsvector;

CREATE OR REPLACE FUNCTION person_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.person_search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.phone, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER person_search_vector_trigger
BEFORE INSERT OR UPDATE ON "Person"
FOR EACH ROW EXECUTE FUNCTION person_search_vector_update();

CREATE INDEX person_search_vector_gin ON "Person" USING GIN (person_search_vector);
```

---

### Y0.3: TicketPerson

```prisma
model TicketPerson {
  id         String  @id @default(cuid())
  ticket_id  String
  ticket     Ticket  @relation(fields: [ticket_id], references: [id])
  person_id  String
  person     Person  @relation(fields: [person_id], references: [id])
  role       String  // "submitter" | "contact"
  created_at DateTime @default(now())

  @@unique([ticket_id, person_id])
  @@index([person_id])
  @@index([ticket_id])
}
```

---

### Y0.4: Category & CategoryGroup

```prisma
model CategoryGroup {
  id         String     @id @default(cuid())
  name       String     @unique
  sort_order Int        @default(0)
  categories Category[]
}

model Category {
  id           String         @id @default(cuid())
  service_code String         @unique
  name         String
  description  String?
  icon         String?        // lucide icon name
  color        String?        // hex #RRGGBB
  anon_allowed Boolean        @default(true)
  active       Boolean        @default(true)

  group_id     String?
  group        CategoryGroup? @relation(fields: [group_id], references: [id])

  department_id String?
  department    Department?   @relation(fields: [department_id], references: [id])

  tickets       Ticket[]
  templates     ResponseTemplate[]

  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  @@index([active])
  @@index([service_code])
}
```

---

### Y0.5: Department

```prisma
model Department {
  id                  String    @id @default(cuid())
  name                String    @unique
  active              Boolean   @default(true)
  default_assignee_id String?
  default_assignee    User?     @relation("DeptDefaultAssignee", fields: [default_assignee_id], references: [id])

  categories          Category[]
  tickets             Ticket[]
  templates           ResponseTemplate[]

  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt
}
```

---

### Y0.6: Substatus

```prisma
model Substatus {
  id             String       @id @default(cuid())
  label          String       // public-facing
  internal_label String?
  status         TicketStatus // parent status bucket
  sort_order     Int          @default(0)
  active         Boolean      @default(true)

  tickets        Ticket[]

  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  @@unique([label, status])
  @@index([status, sort_order])
}
```

---

### Y0.7: TicketHistory

```prisma
model TicketHistory {
  id          String  @id @default(cuid())
  ticket_id   String
  ticket      Ticket  @relation(fields: [ticket_id], references: [id])
  actor_id    String?
  actor       User?   @relation(fields: [actor_id], references: [id])
  action      String  // STATUS_CHANGE | ASSIGNMENT | RESPONSE | MEDIA_ADDED | SUBSTATUS_CHANGE | PERSON_LINKED | PERSON_UNLINKED | PERSON_ANONYMIZED
  from_value  String?
  to_value    String?
  note        String?
  created_at  DateTime @default(now())

  @@index([ticket_id, created_at])
  @@index([actor_id])
}
```

---

### Y0.8: Response

```prisma
model Response {
  id           String   @id @default(cuid())
  ticket_id    String
  ticket       Ticket   @relation(fields: [ticket_id], references: [id])
  author_id    String?
  author       User?    @relation(fields: [author_id], references: [id])
  body         String
  is_public    Boolean  @default(false)
  template_id  String?  // ResponseTemplate reference (for audit; not enforced FK)
  created_at   DateTime @default(now())

  @@index([ticket_id, is_public])
}
```

---

### Y0.9: ResponseTemplate

```prisma
model ResponseTemplate {
  id           String    @id @default(cuid())
  name         String
  body         String
  active       Boolean   @default(true)
  category_id  String?
  category     Category? @relation(fields: [category_id], references: [id])
  department_id String?
  department    Department? @relation(fields: [department_id], references: [id])

  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt

  @@unique([name])
}
```

---

### Y0.10: Media

```prisma
model Media {
  id         String   @id @default(cuid())
  ticket_id  String
  ticket     Ticket   @relation(fields: [ticket_id], references: [id])
  mime_type  String
  filename   String
  data       Bytes?   // bytea for small files (≤ MEDIA_LO_THRESHOLD_KB)
  lo_oid     Int?     // Postgres Large Object OID for large files
  size_bytes Int
  created_at DateTime @default(now())

  @@index([ticket_id])
}
```

---

### Y0.11: User

```prisma
model User {
  id             String    @id @default(cuid())
  username       String    @unique
  email          String    @unique
  password_hash  String
  role           UserRole  @default(staff)
  active         Boolean   @default(true)
  token_version  Int       @default(0) // incremented on password reset
  department_id  String?
  department     Department? @relation("DeptDefaultAssignee", fields: [department_id], references: [id])

  assigned_tickets  Ticket[]         @relation("TicketAssignee")
  history_entries   TicketHistory[]
  responses         Response[]
  bookmarks         BookmarkedFilter[]

  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
}

enum UserRole {
  staff
  admin
}
```

---

### Y0.12: ApiKey

```prisma
model ApiKey {
  id           String    @id @default(cuid())
  label        String    @unique
  key_hash     String    @unique  // SHA-256 of the plaintext key
  scope        ApiScope  @default(read)
  last_used_at DateTime?
  revoked_at   DateTime?
  created_at   DateTime  @default(now())

  @@index([key_hash])
}

enum ApiScope {
  read
  write
}
```

---

### Y0.13: BookmarkedFilter

```prisma
model BookmarkedFilter {
  id          String   @id @default(cuid())
  user_id     String
  user        User     @relation(fields: [user_id], references: [id])
  name        String
  filter_json Json     // serialized filter state
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  @@unique([user_id, name])
  @@index([user_id])
}
```

---

### Y0.14: Indexes Summary

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| Ticket | `search_vector` | GIN | FTS queries |
| Ticket | `(status)` | BTree | Queue filtering |
| Ticket | `(category_id)` | BTree | Category filter |
| Ticket | `(department_id)` | BTree | Dept filter |
| Ticket | `(created_at)` | BTree | Sort, date range |
| Ticket | `(lat, lng)` | BTree | Bbox filter |
| Person | `person_search_vector` | GIN | FTS on contacts |
| Person | `(email)` | BTree | Email lookup |
| TicketHistory | `(ticket_id, created_at)` | BTree | Timeline queries |
| Substatus | `(status, sort_order)` | BTree | UI ordering |
| ApiKey | `(key_hash)` | BTree | Auth lookup |
| BookmarkedFilter | `(user_id)` | BTree | User's saved views |

---
