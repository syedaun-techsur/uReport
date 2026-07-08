---
phase: 03-public-portal-constituent-tracking
verified: 2026-07-08T17:00:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Address search dropdown (Nominatim geocode)"
    expected: "Typing a street address shows a dropdown; clicking a result moves the pin and fills the address field"
    why_human: "Nominatim geocode dropdown is UI-driven — cannot drive via curl or static analysis"
  - test: "Photo attachment stored as bytea/LO (no filesystem write)"
    expected: "Attaching an image and submitting creates the ticket without error; photo is retrievable via DB, not disk"
    why_human: "Photo upload requires browser file input; bytea/LO path exercised at runtime only"
  - test: "Cluster zoom-in on click"
    expected: "Clicking a cluster on /map zooms in to reveal individual pins"
    why_human: "Cluster click-to-zoom is a Leaflet.markercluster runtime behavior — cannot verify via code analysis alone"
---

# Phase 3: Public Portal & Constituent Tracking — Verification Report

**Phase Goal:** Any city resident can report a municipal issue using a map-first form (pin or address, category, description, optional photo and contact), receive a ticket ID, and later look up that ticket's status or view all open issues on a public map — all without logging in

**Verified:** 2026-07-08T17:00:00Z
**Status:** ✅ PASSED
**Re-verification:** No — initial verification (gap-closure context: UAT Test 6 was fixed by 03-05 before this verification ran)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A constituent can navigate to `/`, place a pin, pick a category, enter a description, and submit — receiving a unique ticket ID and link to `/tickets/[id]/confirm` | ✓ VERIFIED | `app/(public)/page.tsx` — full form with Leaflet map, grouped category picker, description textarea, submit handler POSTs multipart to `/api/tickets`; on 201 redirects to `/tickets/${data.ticket_id}/confirm?reference_id=...` |
| 2 | A constituent can optionally attach a photo (Postgres bytea/LO, no filesystem write) and optionally enter contact info; anonymous submission works when category allows it | ✓ VERIFIED | `app/api/tickets/route.ts` calls `storeMedia()` from `lib/media.ts` which uses Prisma bytea/LO — no `fs` calls; anon check at line 83; form submit path skips contact fields when not provided |
| 3 | A constituent can navigate to `/tickets/[id]` with their ticket ID (internal CUID or `reference_id`) and see category, status, substatus, creation date, and any public staff responses — no PII exposed | ✓ VERIFIED | `app/api/tickets/[id]/public/route.ts` uses `findFirst({ OR: [{ id }, { reference_id: id }] })`; response allowlist omits `persons`, `assignee`, `history`; page renders category, status, substatus, description, address, `created_at`, responses |
| 4 | A constituent can navigate to `/map` and see all open/in-progress tickets as clustered Leaflet markers; clicking a pin opens a popup with a "View details" link | ✓ VERIFIED | `app/(public)/map/page.tsx` → `PublicMap` component uses `leaflet.markercluster`; `clusterGroup.addLayer(marker)` with popup `<a href="/tickets/${ticket_id}">View details →</a>`; `/api/tickets/public-map` returns GeoJSON filtered by `status: { in: ['open', 'in_progress'] }` |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Role | Status | Notes |
|----------|------|--------|-------|
| `app/(public)/page.tsx` | Map-first report form | ✓ VERIFIED | 471 lines; Leaflet map, grouped category picker, description, photo, contact, submit handler |
| `app/(public)/map/page.tsx` | Public issues map page | ✓ VERIFIED | 31 lines; wires `PublicMap` to `/api/tickets/public-map` |
| `app/(public)/tickets/[id]/page.tsx` | Ticket detail page | ✓ VERIFIED | 122 lines; renders category, status badge, substatus, description, address, created_at, public responses |
| `app/(public)/tickets/[id]/confirm/page.tsx` | Submission confirmation page | ✓ VERIFIED | 54 lines; shows referenceId to user, links "View Ticket Status" to internal CUID path |
| `app/api/tickets/route.ts` | POST /api/tickets | ✓ VERIFIED | 146 lines; validates, creates ticket, handles anon, stores photo via `storeMedia`, returns `ticket_id + reference_id` |
| `app/api/tickets/[id]/public/route.ts` | GET public ticket detail | ✓ VERIFIED | 60 lines; `findFirst` with `OR: [{ id }, { reference_id: id }]`; PII-free allowlist response |
| `app/api/tickets/public-map/route.ts` | GET GeoJSON map feed | ✓ VERIFIED | 46 lines; filters `open/in_progress`, returns RFC 7946 FeatureCollection |
| `app/api/categories/route.ts` | GET /api/categories | ✓ VERIFIED | 44 lines; returns active categories with group/department metadata for grouped picker |
| `components/maps/ReportingMap.tsx` | Interactive report map | ✓ VERIFIED | 199 lines; click-to-pin with reverse geocode, address search with Nominatim debounced dropdown, marker render |
| `components/maps/PublicMap.tsx` | Clustered public map | ✓ VERIFIED | 115 lines; `leaflet.markercluster`, fetches GeoJSON, popup with "View details" link, issue count display |
| `lib/media.ts` | bytea/LO photo storage | ✓ VERIFIED | 127 lines; no `fs` imports; bytea path for small files, Large Object path for large; `storeMedia/readMedia/deleteMedia` fully implemented |
| `e2e/public-tracking.spec.ts` | E2E test suite | ✓ VERIFIED | 159 lines; covers GeoJSON API, PII checks, ticket detail render, map page, 404 behavior, **reference_id navigation** |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(public)/page.tsx` | `POST /api/tickets` | `fetch('/api/tickets', { method: 'POST', body: formData })` | ✓ WIRED | Line 151; response handled: `data.ticket_id` + `data.reference_id` used for redirect |
| `app/(public)/page.tsx` | `/tickets/${data.ticket_id}/confirm` | `router.push(confirmUrl)` | ✓ WIRED | Line 158–159; uses internal CUID for route, passes reference_id as query param |
| `app/(public)/tickets/[id]/page.tsx` | `GET /api/tickets/${id}/public` | Server-side `fetch` in `getTicket()` | ✓ WIRED | Line 32; response mapped to `TicketDetail`; `notFound()` on 404 |
| `app/(public)/map/page.tsx` | `PublicMap` component | `dynamic(() => import(...PublicMap...))` | ✓ WIRED | Line 6–8; passes `geojsonUrl="/api/tickets/public-map"` |
| `PublicMap` | `GET /api/tickets/public-map` | `fetch(geojsonUrl)` in `ClusteredMarkers` `useEffect` | ✓ WIRED | Line 55; GeoJSON response mapped to Leaflet markers with popup |
| `app/api/tickets/route.ts` | `lib/media.ts` `storeMedia()` | `import { storeMedia } from '@/lib/media'` | ✓ WIRED | Line 8 import; line 124 call with `prisma, ticket.id, photoFile` |
| `app/api/tickets/[id]/public/route.ts` | Prisma (dual-key lookup) | `prisma.ticket.findFirst({ OR: [{ id }, { reference_id: id }] })` | ✓ WIRED | Lines 10–16; **gap-closure fix from 03-05** — both internal CUID and reference_id now resolve |
| `app/(public)/tickets/[id]/confirm/page.tsx` | `/tickets/${ticketId}` | `href={trackingUrl}` | ✓ WIRED | Line 17 sets `trackingUrl = /tickets/${ticketId}` (internal CUID); line 39 renders link |

---

### Requirements Coverage

| Success Criterion | Status | Notes |
|-------------------|--------|-------|
| SC1: pin-or-address → category → description → submit → ticket ID + link to `/tickets/[id]/confirm` | ✓ SATISFIED | Full form wired; Leaflet map click-to-pin + Nominatim reverse geocode; grouped category picker; `POST /api/tickets` → 201; redirect to confirm page |
| SC2: optional photo (Postgres bytea, no filesystem write); optional contact info; anonymous submission works | ✓ SATISFIED | `storeMedia()` uses bytea/LO only; anon check skipped when `anon_allowed=true`; contact fields optional |
| SC3: `/tickets/[id]` shows category, status, substatus, creation date, public staff responses — no PII | ✓ SATISFIED | `findFirst` with OR covers both internal CUID and reference_id; response allowlist deliberately omits persons/assignee/history |
| SC4: `/map` shows clustered Leaflet markers for open/in-progress tickets; cluster zooms in on click; pin popup has "View details" link | ✓ SATISFIED (automated) | GeoJSON feed filters `open/in_progress`; `leaflet.markercluster` imported and used; popup contains `View details →` link. Cluster-zoom behavior needs human verification. |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/(public)/page.tsx` | 249 | `placeholder="…"` on textarea | ℹ️ Info | HTML input placeholder — expected UX pattern, not a code stub |
| `components/maps/ReportingMap.tsx` | 124 | `placeholder="Search address..."` on input | ℹ️ Info | HTML input placeholder — expected UX pattern, not a code stub |
| `components/maps/PublicMap.tsx` | 82 | `return null` | ℹ️ Info | `ClusteredMarkers` is a Leaflet hook component (uses `useMap`) — `return null` is correct for hook-only components that don't render DOM |
| `components/maps/ReportingMap.tsx` | 57 | `return null` | ℹ️ Info | `MapClickHandler` is a Leaflet hook component — `return null` is correct pattern |

**No blockers or warnings found.** All `return null` instances are legitimate Leaflet hook-component patterns, not stubs.

---

### Human Verification Required

#### 1. Address Search Dropdown (Nominatim)

**Test:** Navigate to `/`, type a partial street address (e.g., "400 N Dunn") in the search field
**Expected:** A dropdown appears with up to 5 Nominatim results; clicking a result moves the map pin to that location and fills the address field; the confirmation message below the map shows the coordinates and address
**Why human:** Nominatim API call is browser-initiated with debounce; dropdown visibility and map `flyTo` are runtime behaviors

#### 2. Photo Attachment via Browser

**Test:** On `/`, click "+ Add photo", select an image file, fill in location/category/description, submit
**Expected:** Form submits successfully (201), confirmation page shows the ticket ID, no filesystem path appears in any response header or error
**Why human:** `<input type="file">` cannot be driven by curl; bytea vs. LO code path is verified statically but runtime behavior requires actual file upload

#### 3. Map Cluster Zoom-In on Click

**Test:** Navigate to `/map` with multiple open tickets in the same area (seed data helps); click a cluster circle
**Expected:** Map zooms in to reveal sub-clusters or individual pins
**Why human:** `leaflet.markercluster` cluster-click-to-zoom is a runtime event handler — the library handles it internally when `L.markerClusterGroup()` is used

---

### Gap-Closure Summary

This verification was run after plan 03-05 fixed the sole UAT blocker:

**UAT Test 6 gap (TRACK-01):** `GET /tickets/[reference_id]` returned 404 because the public API used `findUnique({ where: { id } })` which only matched internal CUIDs. The confirmation page shows `reference_id` as the user-facing "Ticket ID" — so a constituent who saved that ID and later navigated to `/tickets/[reference_id]` received a 404.

**Fix applied (commit `6dc7b80`):** `findUnique` replaced with `findFirst({ where: { OR: [{ id }, { reference_id: id }] } })`. Since `reference_id` has a `@unique` constraint in the Prisma schema, there is no ambiguity: the OR short-circuits on first match. Both navigation paths now resolve: `/tickets/[cuid]` ✓ and `/tickets/[reference_id]` ✓.

All 7 UAT tests now have passing implementations. Tests 4 (photo) and 5 (address search) require human browser verification.

---

### Confidence Assessment

The codebase is complete and connected:

- **Form → API wiring**: Substantive `fetch` call with full response handling ✓
- **API → DB wiring**: Prisma queries are real (not static returns) ✓  
- **Reference_id fix**: `findFirst` with OR confirmed at lines 10–16 of the public route ✓
- **PII protection**: Deliberately excluded from include clause with code comment ✓
- **No stubs**: All components render real data; no placeholder text bodies ✓
- **TypeScript**: `tsc --noEmit` exits clean (0 errors) ✓
- **Dependencies**: `leaflet`, `react-leaflet`, `leaflet.markercluster` all present in `package.json` ✓
- **E2E coverage**: 8 tests including the new reference_id navigation path ✓

---

*Verified: 2026-07-08T17:00:00Z*  
*Verifier: Claude (pivota_spec-verifier)*
