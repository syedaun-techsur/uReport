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
