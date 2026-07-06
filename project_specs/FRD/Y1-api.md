
---

## Y1: API Endpoint Catalog

All endpoints use Next.js 15 App Router Route Handlers (`app/api/.../route.ts`). JSON is the default response format unless noted. All staff/admin endpoints require Auth.js session (`[AUTH: staff]` or `[AUTH: admin]`). Public endpoints are marked `[PUBLIC]`. Open311 endpoints are covered separately in §Open311.

---

### §Public Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/tickets` | [PUBLIC] | Submit new ticket |
| GET | `/api/tickets/[id]/public` | [PUBLIC] | Public ticket status |
| GET | `/api/tickets/public-map` | [PUBLIC] | GeoJSON for public map |

---

#### POST /api/tickets

**Request:** `multipart/form-data`
```
lat: number
lng: number
address: string
category_id: string
description: string
name?: string
email?: string
phone?: string
files[]: File[] (max 5, each max MEDIA_MAX_SIZE_MB)
```

**Response 201:**
```json
{
  "ticket_id": "string",
  "reference_id": "string",
  "status": "open",
  "category_name": "string",
  "created_at": "ISO8601"
}
```

**Errors:** 422 VALIDATION_ERROR | 422 INVALID_CATEGORY | 422 CONTACT_REQUIRED | 422 MEDIA_TOO_LARGE | 500 SUBMISSION_FAILED

---

#### GET /api/tickets/[id]/public

**Response 200:**
```json
{
  "ticket_id": "string",
  "reference_id": "string",
  "category_name": "string",
  "status": "string",
  "substatus_label": "string | null",
  "address": "string",
  "lat": "number | null",
  "lng": "number | null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "public_responses": [{ "body": "string", "created_at": "ISO8601" }]
}
```

---

#### GET /api/tickets/public-map

**Response 200:** GeoJSON FeatureCollection (max 5000 features, `status IN (open, in_progress)`)

---

### §Categories (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/categories` | [PUBLIC] | List active categories |

**Response 200:**
```json
[
  {
    "id": "string",
    "service_code": "string",
    "name": "string",
    "description": "string | null",
    "icon": "string | null",
    "color": "string | null",
    "anon_allowed": "boolean",
    "department_name": "string | null"
  }
]
```

---

### §Media

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/media/[id]` | [PUBLIC for public tickets; AUTH: staff for internal] | Serve media file |

**Response 200:** Binary stream with `Content-Type`, `Content-Disposition`, `Cache-Control` headers.

---

### §Staff Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/tickets` | [AUTH: staff] | Paginated/filtered ticket queue |
| GET | `/api/staff/tickets/[id]` | [AUTH: staff] | Full ticket detail |
| PATCH | `/api/staff/tickets/[id]` | [AUTH: staff] | Update status/substatus/assignee |
| PATCH | `/api/staff/tickets/bulk` | [AUTH: staff] | Bulk status/assign update |
| GET | `/api/staff/tickets/[id]/responses` | [AUTH: staff] | List all responses |
| POST | `/api/staff/tickets/[id]/responses` | [AUTH: staff] | Add response/note |
| POST | `/api/staff/tickets/[id]/media` | [AUTH: staff] | Upload media to ticket |
| POST | `/api/staff/tickets/[id]/persons` | [AUTH: staff] | Link person to ticket |
| DELETE | `/api/staff/tickets/[id]/persons/[person_id]` | [AUTH: staff] | Unlink person |

---

#### GET /api/staff/tickets — Query Params

```
q?: string (FTS)
category_id?: string
department_id?: string
status?: open|in_progress|closed|archived
substatus_id?: string
assignee_id?: string
date_from?: ISO8601
date_to?: ISO8601
bbox?: "minLat,minLng,maxLat,maxLng"
sort?: created_at|updated_at  (default: created_at)
order?: asc|desc  (default: desc)
page?: number  (default: 1)
page_size?: number  (default: 25, max: 100)
```

**Response 200:**
```json
{
  "data": [ { "ticket_id": "...", "reference_id": "...", "category_name": "...", "department_name": "...", "status": "...", "substatus_label": "...", "assignee_name": "...", "address": "...", "created_at": "...", "updated_at": "..." } ],
  "meta": { "total": 0, "page": 1, "page_size": 25, "total_pages": 0 }
}
```

---

#### PATCH /api/staff/tickets/[id]

**Request body (JSON):**
```json
{
  "status": "open|in_progress|closed|archived (optional)",
  "substatus_id": "string|null (optional)",
  "assignee_id": "string|null (optional)",
  "note": "string (optional, stored as internal response)"
}
```
**Response 200:** Updated ticket detail object.

---

#### PATCH /api/staff/tickets/bulk

**Request body (JSON):**
```json
{
  "ticket_ids": ["string"],
  "action": "status|assign",
  "value": "string"
}
```
**Response 200:** `{ "updated": number, "failed": ["string"] }`

---

#### POST /api/staff/tickets/[id]/responses

**Request body (JSON):**
```json
{
  "body": "string",
  "is_public": "boolean",
  "template_id": "string (optional)"
}
```
**Response 201:** `{ "response_id": "string", "body": "string", "is_public": boolean, "created_at": "ISO8601" }`

---

### §Staff Bookmarks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/bookmarks` | [AUTH: staff] | List user's bookmarks |
| POST | `/api/staff/bookmarks` | [AUTH: staff] | Create bookmark |
| GET | `/api/staff/bookmarks/[id]` | [AUTH: staff] | Get single bookmark |
| PATCH | `/api/staff/bookmarks/[id]` | [AUTH: staff] | Update bookmark |
| DELETE | `/api/staff/bookmarks/[id]` | [AUTH: staff] | Delete bookmark |

**POST/PATCH body:** `{ "name": "string", "filter_json": { ...filterState } }`

---

### §Staff Users & Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/users` | [AUTH: staff] | Staff user typeahead (q param) |
| GET | `/api/staff/response-templates` | [AUTH: staff] | List active response templates |
| POST | `/api/staff/account/password` | [AUTH: staff] | Self-service password change |

---

### §CRM (People)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/people` | [AUTH: staff] | Person search |
| GET | `/api/staff/people/[id]` | [AUTH: staff] | Person detail + linked tickets |
| PATCH | `/api/staff/people/[id]` | [AUTH: staff] | Update person record |
| POST | `/api/staff/people/merge` | [AUTH: staff] | Merge two person records |
| PATCH | `/api/staff/people/[id]/anonymize` | [AUTH: staff] | Anonymize person |

---

### §Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/staff/reports/volume-by-category` | [AUTH: staff] | Time-series by category |
| GET | `/api/staff/reports/volume-by-department` | [AUTH: staff] | Time-series by department |
| GET | `/api/staff/reports/status-breakdown` | [AUTH: staff] | Open/closed counts |
| GET | `/api/staff/reports/resolution-time` | [AUTH: staff] | Mean/median resolution time |
| GET | `/api/staff/reports/geo-density` | [AUTH: staff] | GeoJSON for density map |
| GET | `/api/staff/reports/export` | [AUTH: staff] | CSV export |

All report endpoints accept: `start_date?, end_date?, interval?, group_by?, status?, format?`

---

### §Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/api/admin/categories` | [AUTH: admin] | List / create categories |
| PATCH | `/api/admin/categories/[id]` | [AUTH: admin] | Update / deactivate category |
| GET/POST | `/api/admin/departments` | [AUTH: admin] | List / create departments |
| PATCH | `/api/admin/departments/[id]` | [AUTH: admin] | Update department |
| GET/POST | `/api/admin/substatuses` | [AUTH: admin] | List / create substatuses |
| PATCH | `/api/admin/substatuses/[id]` | [AUTH: admin] | Update substatus |
| PATCH | `/api/admin/substatuses/reorder` | [AUTH: admin] | Batch reorder substatuses |
| GET/POST | `/api/admin/response-templates` | [AUTH: admin] | List / create templates |
| PATCH | `/api/admin/response-templates/[id]` | [AUTH: admin] | Update template |
| GET/POST | `/api/admin/users` | [AUTH: admin] | List / create users |
| PATCH | `/api/admin/users/[id]` | [AUTH: admin] | Update user (deactivate, role) |
| POST | `/api/admin/users/[id]/reset-password` | [AUTH: admin] | Reset user password |
| GET/POST | `/api/admin/api-keys` | [AUTH: admin] | List / generate API keys |
| PATCH | `/api/admin/api-keys/[id]` | [AUTH: admin] | Revoke API key |

---

### §Open311

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v2/services` | [PUBLIC] | List active service categories |
| GET | `/api/v2/services/[service_code]` | [PUBLIC] | Service definition |
| POST | `/api/v2/requests` | [AUTH: api-key write] | Submit service request |
| GET | `/api/v2/requests` | [PUBLIC + rate limit] | Query service requests |
| GET | `/api/v2/requests/[service_request_id]` | [PUBLIC + rate limit] | Single request detail |

**Content negotiation:** All Open311 endpoints respond with JSON by default. Pass `?format=xml` or `Accept: application/xml` for XML.

---

### §Infrastructure

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health/live` | [PUBLIC] | Liveness probe |
| GET | `/api/health/ready` | [PUBLIC] | Readiness probe |
| GET | `/api/media/[id]` | [PUBLIC/STAFF] | Serve media |

---

### §Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/[...nextauth]` | [PUBLIC] | Auth.js login/logout/session |
| POST | `/api/staff/account/password` | [AUTH: staff] | Change own password |

---

### Common Response Envelope (Error)

All non-Open311 error responses use:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "field_errors": { "field_name": "error message" }
  }
}
```

`field_errors` is present only for 422 validation errors.

---
