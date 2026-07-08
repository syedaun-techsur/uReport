---
status: complete
phase: 03-public-portal-constituent-tracking
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md]
started: 2026-07-08T15:57:00Z
updated: 2026-07-08T16:40:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Report Form Loads with Map and Categories
expected: Navigate to / — page shows a Leaflet map with "Report a Municipal Issue" heading, grouped category picker (categories grouped by type such as Streets & Transportation, Parks & Recreation, Utilities), description textarea, optional contact fields (name/email/phone), and photo file input. Map is interactive — clicking drops a pin.
result: pass

### 2. Drop a Pin and Submit a Report
expected: Click anywhere on the map — a pin drops and the address field auto-fills via reverse geocode (Nominatim). Fill in a category and description and submit — you receive a unique ticket ID and are redirected to a confirmation page showing "Report Submitted!" with the reference ID.
result: pass

### 3. Anonymous Submission (no contact info)
expected: Submit a report without filling in name/email/phone — the form accepts it and creates the ticket. The confirmation page shows without requiring any personal details.
result: pass

### 4. Photo Attachment
expected: Attach an image file to the report form and submit — the ticket is created successfully (the photo is stored as Postgres bytea, no filesystem write). No error is shown.
result: pass

### 5. Address Search (Nominatim geocode)
expected: Type a street address into the address search box on the map — a dropdown of matching results appears. Clicking a result moves the map pin to that location and fills the address field.
result: pass

### 6. Ticket Lookup by ID
expected: Navigate to /tickets/[id] with a known ticket ID — see the ticket's category, status, creation date, description, and address. No PII (email/phone/name) is exposed on this public page.
result: pass
note: "Gap closed by 03-05-PLAN.md (findFirst OR [{id},{reference_id}]). Re-verified by human UAT."

### 7. Public Map View
expected: Navigate to /map and see a Leaflet map with clustered markers for open/in-progress tickets. Clicking a cluster zooms in. Clicking a pin opens a popup with a "View details" link.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0

## Self-Check

boot: 200
routes_probed: 7 ok / 0 failed
cookie: n/a (public routes — no auth required)
per_test:
  - test: 1
    verdict: advisory
    note: "🤖 Auto-check: GET / → 200. DB was empty on this sandbox session (seed hadn't auto-run yet); manually ran npm run db:seed — 6 categories now in DB across Parks & Recreation, Streets & Transportation, Utilities. The 03-04 fix updates start-dev.sh to auto-seed on next fresh boot."
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: POST /api/tickets (multipart) → 201 with ticket_id, reference_id, status, category_name. Confirmation page /tickets/[id]/confirm → 200."
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: POST /api/tickets without name/email/phone (multipart) → 201. Anonymous submission accepted."
  - test: 4
    verdict: skipped (needs human)
    note: "Photo upload requires browser file input — cannot drive via curl."
  - test: 5
    verdict: skipped (needs human)
    note: "Nominatim geocode dropdown is UI-only — cannot drive via curl."
  - test: 6
    verdict: fail
    note: "🤖 Auto-check: GET /api/tickets/[internal_id]/public → 200. But confirmation page shows reference_id as the 'Ticket ID' to copy. GET /tickets/[reference_id] → 404 because route only queries by internal id. Root cause: public API and ticket detail page use findUnique({ where: { id } }) (internal CUID) — reference_id lookup not supported."
  - test: 7
    verdict: pass
    note: "🤖 Auto-check: GET /api/tickets/public-map → 200 GeoJSON FeatureCollection (1 open ticket feature). GET /map → 200."

## Gaps

- truth: "Navigating to /tickets/[reference_id] shows the ticket's category, status, creation date, description, and address"
  status: failed
  reason: "User reported: 404 page not found"
  severity: major
  test: 6
  source: user
  root_cause: "Public API route uses findUnique({ where: { id } }) which only matches internal CUIDs. Confirmation page shows reference_id as the user-facing Ticket ID. When user navigates to /tickets/[reference_id], the API returns 404 because reference_id lookup is not supported."
  artifacts:
    - path: "app/api/tickets/[id]/public/route.ts"
      issue: "findUnique({ where: { id } }) only looks up by internal CUID — reference_id not supported"
    - path: "app/(public)/tickets/[id]/confirm/page.tsx"
      issue: "Line 30: shows reference_id as the user-facing Ticket ID, but route only accepts internal id"
  missing:
    - "Change findUnique({ where: { id } }) to findFirst({ where: { OR: [{ id }, { reference_id: id }] } }) in app/api/tickets/[id]/public/route.ts so both id and reference_id resolve the ticket"
  debug_session: ""
