
---

## F07: Open311 GeoReport v2 API

**Description:** A fully backward-compatible implementation of the Open311 GeoReport v2 specification, exposed at `/api/v2/`. This surface is the integration contract for third-party clients (mobile apps, 311 aggregators) and must not regress. All field names match the GeoReport v2 specification exactly. Both JSON (default) and XML response formats are supported via `format=xml` query param or `Accept: application/xml` header. POST endpoints require a valid API key. GET endpoints are public with optional rate limiting.

**Terminology:**
- **service_request_id** — Open311 name for what this system calls `ticket_id` (CUID).
- **service_code** — Open311 name for `Category.service_code`.
- **requested_datetime** — Open311 name for `Ticket.created_at` (ISO8601 UTC).
- **updated_datetime** — Open311 name for `Ticket.updated_at`.
- **status_notes** — The most recent public `Response.body` on the ticket, or null.
- **Content negotiation** — JSON returned by default; XML returned when `format=xml` param or `Accept: application/xml` header is present.

**Sub-features:**
- `GET /api/v2/services` — list all active service categories
- `GET /api/v2/services/{service_code}` — single service definition with attribute schema
- `POST /api/v2/requests` — submit a new service request (API-key required)
- `GET /api/v2/requests` — query service requests (filterable, paginated)
- `GET /api/v2/requests/{service_request_id}` — single request detail
- JSON + XML response format support
- Rate limiting on GET endpoints
- API key authentication on POST

---

### F07.1: GET /api/v2/services

**Process:**
1. Request received (public, no auth).
2. Fetch all `Category` records where `active = true`, ordered by `name ASC`.
3. Map each to Open311 `service` object (see field mapping below).
4. Return JSON array or XML `<services>` document.

**Open311 Field Mapping — Service:**

| Open311 Field | Source Field | Notes |
|---------------|-------------|-------|
| `service_code` | `Category.service_code` | |
| `service_name` | `Category.name` | |
| `description` | `Category.description` | |
| `metadata` | `false` | v1 has no extended attributes |
| `type` | `"realtime"` | All categories are realtime |
| `keywords` | `""` | Reserved for future use |
| `group` | `CategoryGroup.name` or `""` | |

---

### F07.2: GET /api/v2/services/{service_code}

**Process:**
1. Look up `Category` by `service_code`. If not found or `active = false` → `404`.
2. Return service object + `attributes: []` (no extended attributes in v1).

---

### F07.3: POST /api/v2/requests

**Process:**
1. Extract API key from `api_key` query param or `X-Api-Key` header.
2. Hash the supplied key with SHA-256; look up `ApiKey` by `key_hash`.
3. If not found, hash mismatch, or `revoked_at IS NOT NULL` → `401 UNAUTHORIZED`.
4. Check `ApiKey.scope = "write"`; if `scope = "read"` → `403 FORBIDDEN`.
5. Update `ApiKey.last_used_at = now()`.
6. Parse and validate request body (see Inputs).
7. Look up `Category` by `service_code`. If not found → `404 SERVICE_CODE_NOT_FOUND`.
8. If `anon_allowed = false` and no contact info provided → `422 CONTACT_REQUIRED`.
9. Create `Ticket` + optional `Person` + optional `Media` (same transaction as F00).
10. Return `201` with array containing one `service_request` object.

**Open311 Field Mapping — POST Request Input:**

| Open311 Field | Destination | Required | Notes |
|---------------|-------------|----------|-------|
| `service_code` | `Category.service_code` lookup | Yes | |
| `lat` | `Ticket.lat` | Yes | |
| `long` | `Ticket.lng` | Yes | Note: Open311 uses `long` not `lng` |
| `address_string` | `Ticket.address` | Cond. | Required if lat/long absent |
| `description` | `Ticket.description` | Yes | |
| `first_name` | `Person.name` (first) | No | Combined with last_name |
| `last_name` | `Person.name` (last) | No | |
| `email` | `Person.email` | No | |
| `phone` | `Person.phone` | No | |
| `api_key` | Auth | Yes | |
| `media_url` | Ignored in v1 | No | Future media-by-URL feature |

**Open311 Field Mapping — Response (service_request object):**

| Open311 Field | Source Field | Notes |
|---------------|-------------|-------|
| `service_request_id` | `Ticket.id` | |
| `status` | `Ticket.status` mapped | `open` → `open`, `in_progress` → `open`, `closed` → `closed`, `archived` → `closed` |
| `status_notes` | Latest public `Response.body` | null if none |
| `service_name` | `Category.name` | |
| `service_code` | `Category.service_code` | |
| `description` | `Ticket.description` | |
| `agency_responsible` | `Department.name` | |
| `service_notice` | `null` | |
| `requested_datetime` | `Ticket.created_at` | ISO8601 UTC |
| `updated_datetime` | `Ticket.updated_at` | ISO8601 UTC |
| `expected_datetime` | `null` | Not implemented v1 |
| `address` | `Ticket.address` | |
| `address_id` | `null` | |
| `zipcode` | `null` | |
| `lat` | `Ticket.lat` | |
| `long` | `Ticket.lng` | Note: Open311 uses `long` |
| `media_url` | `null` | Not exposed externally v1 |

---

### F07.4: GET /api/v2/requests

**Process:**
1. Apply rate limit: `OPEN311_RATE_LIMIT` req/min per IP (default 60; env-configurable).
2. Parse and validate query params (see Inputs).
3. Build Prisma query with all active filters.
4. Return paginated array of `service_request` objects.

**Query Parameters:**

| Param | Type | Notes |
|-------|------|-------|
| `service_request_id` | string | Exact ID lookup |
| `service_code` | string | Filter by category |
| `status` | `open\|closed` | Maps to internal multi-status |
| `start_date` | ISO8601 | `requested_datetime >=` |
| `end_date` | ISO8601 | `requested_datetime <=` |
| `page` | number | ≥1; default 1 |
| `page_size` | number | 1–100; default 20; max 100 |
| `format` | `json\|xml` | Response format |

*Open311 `status` mapping:*
- `open` → `Ticket.status IN ('open', 'in_progress')`
- `closed` → `Ticket.status IN ('closed', 'archived')`

---

### F07.5: GET /api/v2/requests/{service_request_id}

**Process:**
1. Look up `Ticket` by `id`. If not found → `404`.
2. Return array with one `service_request` object (Open311 spec returns an array even for single-item lookup).

---

### Content Negotiation

- Default: `Content-Type: application/json`
- XML trigger: `?format=xml` OR `Accept: application/xml`
- XML root element for services: `<services>`, child: `<service>`
- XML root element for requests: `<service_requests>`, child: `<request>`
- XML is generated via a lightweight serializer (no external XML library required); element names match Open311 spec exactly.

**Inputs — POST /api/v2/requests (Zod):**
```typescript
z.object({
  service_code: z.string().min(1).max(50),
  lat: z.coerce.number().min(-90).max(90).optional(),
  long: z.coerce.number().min(-180).max(180).optional(),
  address_string: z.string().max(500).optional(),
  description: z.string().min(10).max(4000),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  api_key: z.string().optional(), // also accepted as header
}).refine(d => d.lat !== undefined || d.address_string, {
  message: "lat/long or address_string required",
});
```

**Error States:**

| Scenario | HTTP Status | Error Code | Open311 Error Message |
|----------|-------------|------------|-----------------------|
| Missing/invalid API key | 401 | `key_not_found` | "API key was not found" |
| Read-only key on POST | 403 | `key_read_only` | "API key does not have write permission" |
| service_code not found | 404 | `service_not_found` | "Service not found" |
| No location provided | 422 | `location_required` | "lat/long or address_string required" |
| Contact required | 422 | `contact_required` | "Contact information required for this service" |
| Validation error | 422 | `validation_error` | Field-level detail |
| Rate limit exceeded | 429 | `rate_limit` | "Too many requests" |
| Server error | 500 | `server_error` | "Internal server error" |

*Note: Open311 error responses use `{ errors: [{ code, description }] }` format for JSON and `<errors><error>` for XML.*

**API Surface (this feature):**
- `GET /api/v2/services` — list services
- `GET /api/v2/services/[service_code]` — service detail
- `POST /api/v2/requests` — submit request
- `GET /api/v2/requests` — query requests
- `GET /api/v2/requests/[service_request_id]` — single request
→ see `Y1-api.md §Open311`

**Schema Surface (this feature):** uses `Ticket`, `Category`, `CategoryGroup`, `Department`, `Person`, `TicketPerson`, `Response`, `ApiKey` — see `Y0-schema.md`.

---
