
---

## F01: Constituent Issue Tracking

**Description:** Allows any visitor (no login required) to look up the status of a previously submitted ticket by its ID and view a public map of all currently open issues across the city. The ticket lookup displays only public-safe fields — internal staff notes are not exposed. The public map uses Leaflet marker clustering to handle high ticket density efficiently.

**Terminology:**
- **Public fields** — Ticket fields safe to display to unauthenticated users: ID, category, status, substatus (public label), creation date, last-updated date, address, and any response notes flagged `is_public = true`.
- **Marker clustering** — Leaflet.markercluster grouping nearby pins at low zoom levels; individual pins reveal on zoom or cluster click.
- **Deep link** — A stable, shareable URL of the form `/tickets/[id]` that resolves to a single ticket's public status page.

**Sub-features:**
- Ticket lookup by ID (URL param or search form)
- Public status page with all public-safe fields
- Public map showing all `status IN (open, in_progress)` tickets with clustering
- Cluster expansion on zoom / click
- Individual ticket popup with summary + deep-link button
- No authentication required for any sub-feature

**Process — Ticket Lookup:**
1. User navigates to `/tickets/[id]` (deep link) or enters an ID in the lookup form on `/`.
2. Server fetches the ticket by ID. If not found, return `404` and render "Ticket not found" page.
3. Server filters the response to public-safe fields only (see Outputs).
4. Page renders: ticket ID (displayed as reference), category name, status (human-readable), substatus public label (if set), submission date, last-updated date, address, and any `Response` records where `is_public = true`.
5. A Leaflet mini-map renders the ticket pin location.
6. A "Copy link" button is present for sharing the URL.

**Process — Public Map:**
1. User navigates to `/map` or activates the map tab on the home page.
2. Client requests `GET /api/tickets/public-map` which returns all tickets with `status IN ('open','in_progress')` as a GeoJSON FeatureCollection (lat, lng, ticket_id, category_name, status).
3. Leaflet renders markers from the GeoJSON. Leaflet.markercluster clusters markers at zoom < 14.
4. Clicking a cluster zooms in and expands. Clicking an individual marker opens a popup: category icon, category name, status badge, address snippet, "View details →" link to `/tickets/[id]`.
5. Map refreshes stale data if tab becomes active after >5 minutes.

**Inputs:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` (URL param) | `string (cuid)` | Yes (for lookup) | Must match existing ticket |
| Map bounding box (implicit) | Derived from Leaflet viewport | — | Server returns all public tickets; client-side clustering |

**Outputs:**

*Ticket lookup (`GET /api/tickets/[id]/public`):*
```json
{
  "ticket_id": "string",
  "reference_id": "string",
  "category_name": "string",
  "status": "open | in_progress | closed | archived",
  "substatus_label": "string | null",
  "address": "string",
  "lat": "number",
  "lng": "number",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "public_responses": [
    { "body": "string", "created_at": "ISO8601" }
  ]
}
```

*Public map (`GET /api/tickets/public-map`):*
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [lng, lat] },
      "properties": {
        "ticket_id": "string",
        "category_name": "string",
        "status": "string",
        "address_snippet": "string"
      }
    }
  ]
}
```

**Validation:**
- `id` must be a valid CUID string format; otherwise return `400 INVALID_ID`.
- Ticket must exist in DB; otherwise return `404 NOT_FOUND`.
- `public-map` endpoint caps response at 5000 features to avoid oversized payloads; oldest tickets dropped first if over limit.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid ticket ID format | 400 | INVALID_ID | "Invalid ticket ID format" |
| Ticket not found | 404 | NOT_FOUND | "Ticket not found" |
| DB unavailable | 503 | DB_UNAVAILABLE | "Service temporarily unavailable" |

**API Surface (this feature):**
- `GET /api/tickets/[id]/public` — public ticket detail → see `Y1-api.md §Tickets`
- `GET /api/tickets/public-map` — GeoJSON for public map → see `Y1-api.md §Tickets`

**Schema Surface (this feature):** reads `Ticket`, `Category`, `Substatus`, `Response` (is_public filter) — see `Y0-schema.md`.

---
