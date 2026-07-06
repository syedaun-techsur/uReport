
---

## F00: Public Constituent Portal

**Description:** The primary entry point for city residents to report municipal issues. This feature provides a map-first, multi-step reporting flow where constituents drop a pin or type an address on a Leaflet/OpenStreetMap map, select a service category, write a description, optionally attach a photo, and optionally provide contact information. The form supports anonymous submissions on a per-category basis. On successful submission a confirmation screen displays the generated ticket ID. The entire portal is WCAG 2.1 AA compliant and responsive for mobile field use.

**Terminology:**
- **Anonymous submission** — A ticket submitted without any contact information. Allowed only when the selected category has `anon_allowed = true`.
- **Geo-pin** — A map marker placed by the user to indicate the issue location.
- **Reverse geocode** — Translating lat/lng coordinates to a human-readable address string (performed client-side via Nominatim or equivalent OSM service).
- **Submission token** — A short-lived (30-minute) CSRF token bound to the submission session.

**Sub-features:**
- Interactive map with pin placement (Leaflet + OpenStreetMap)
- Address text search with autocomplete (Nominatim/OSM)
- Category selection with department routing display
- Description text entry
- Optional media/photo upload
- Optional contact information (name, email, phone)
- Anonymous mode enforcement per category
- WCAG 2.1 AA keyboard navigation and ARIA labels throughout
- Confirmation screen with ticket ID and shareable URL

**Process:**
1. User navigates to `/` (public portal home).
2. System renders the Leaflet map centered on the city's configured default coordinates (`CITY_CENTER_LAT`, `CITY_CENTER_LNG` env vars) at zoom level 13.
3. User either: (a) clicks the map to drop a pin, or (b) types an address in the search box.
4. If address typed: system queries Nominatim with the input; displays a dropdown of up to 5 candidate addresses; user selects one; system places a pin at the selected lat/lng and populates the address field.
5. System validates that the pin is within the city's configured bounding box (`CITY_BBOX_MINLAT`, `CITY_BBOX_MINLNG`, `CITY_BBOX_MAXLAT`, `CITY_BBOX_MAXLNG`). If outside bounds, display warning but do not block submission.
6. User selects a category from the dropdown (populated from active categories only). System displays the routing department name below the selector.
7. User enters a description (free text, required, ≥10 characters, ≤4000 characters).
8. User optionally attaches a photo via file input (max 10MB, MIME: `image/*` or `application/pdf`; multiple files up to 5).
9. If category has `anon_allowed = false`, contact information fields (name, email, phone) are shown as required. If `anon_allowed = true`, contact fields are optional and labeled "Optional — leave blank to submit anonymously."
10. User submits the form. Client validates all required fields before POST.
11. Server receives `POST /api/tickets` with multipart form data. Server validates all fields (see Validation). Server creates a `Ticket` record plus `Media` records (if files attached) plus a `Person` record and `TicketPerson` join (if contact info provided) within a single Prisma transaction.
12. Server returns `201 Created` with `{ ticket_id, reference_id, status, category_name, created_at }`.
13. Client navigates to confirmation screen `/tickets/[id]/confirm` showing the ticket ID, a link to `/tickets/[id]` for tracking, and a message to save the ID.

**Inputs:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `lat` | `number` | Yes | Valid latitude −90 to 90 |
| `lng` | `number` | Yes | Valid longitude −180 to 180 |
| `address` | `string` | Yes | ≥5 chars, ≤500 chars |
| `category_id` | `string (cuid)` | Yes | Must match an active category |
| `description` | `string` | Yes | ≥10 chars, ≤4000 chars |
| `name` | `string` | Conditional | Required if `anon_allowed=false`; ≤200 chars |
| `email` | `string (email)` | Conditional | Required if `anon_allowed=false`; valid email |
| `phone` | `string` | Optional | E.164 or local format; ≤30 chars |
| `files[]` | `File[]` | Optional | ≤5 files; each ≤10MB; MIME `image/*` or `application/pdf` |

**Outputs:**
- `201 Created` JSON: `{ ticket_id: string, reference_id: string, status: "open", category_name: string, created_at: ISO8601 }`
- Confirmation page rendered at `/tickets/[id]/confirm`
- Email notification to constituent if email provided (future — out of scope v1, framework hook present)

**Validation (Zod):**
```typescript
z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(5).max(500),
  category_id: z.string().cuid(),
  description: z.string().min(10).max(4000),
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
})
```
- If category `anon_allowed = false` and both `name` and `email` are absent → validation error `CONTACT_REQUIRED`.
- File size checked server-side; MIME type validated against allowlist.
- `category_id` verified to exist and be active via DB lookup inside the route handler (after schema parse).

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Missing required field | 422 | VALIDATION_ERROR | Field-level Zod errors array |
| category_id not found / inactive | 422 | INVALID_CATEGORY | "Selected category is not available" |
| Contact required but absent | 422 | CONTACT_REQUIRED | "Contact information is required for this category" |
| File too large | 422 | MEDIA_TOO_LARGE | "File exceeds 10MB limit" |
| Unsupported MIME type | 422 | MEDIA_TYPE_INVALID | "File type not accepted" |
| Too many files | 422 | MEDIA_TOO_MANY | "Maximum 5 files per submission" |
| DB write failure | 500 | SUBMISSION_FAILED | "Submission failed — please try again" |
| Nominatim unavailable | 503 | GEOCODE_UNAVAILABLE | "Address search temporarily unavailable" (non-blocking — user can still pin manually) |

**API Surface (this feature):**
- `POST /api/tickets` — create ticket (public, no auth required) → see `Y1-api.md §Tickets`
- `GET /api/categories` — list active categories for dropdown → see `Y1-api.md §Categories`
- `GET /api/media/[id]` — serve uploaded media → see `Y1-api.md §Media`

**Schema Surface (this feature):** uses `Ticket`, `Person`, `TicketPerson`, `Category`, `Media` — see `Y0-schema.md`.

---
