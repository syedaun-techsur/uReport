---
status: complete
phase: 04-open311-georeport-v2-api
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md]
started: 2026-07-08T18:45:00Z
updated: 2026-07-08T18:52:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Services List Endpoint
expected: GET /api/open311/services returns a JSON array of active categories in GeoReport v2 format (no { data: [] } envelope — bare array). Each item includes service_code, service_name, type, keywords, group fields.
result: pass
note: "User saw raw JSON text with all 6 services and correct fields — correct API behavior."

### 2. Single Service Endpoint
expected: GET /api/open311/services/{service_code} returns the matching service definition. A non-existent service_code returns a 404 error in Open311 error format ({ errors: [{ code, description }] }).
result: pass

### 3. Create Service Request (API Key Auth)
expected: POST /api/open311/requests with a valid write-scoped API key creates a ticket and returns { service_request_id: "..." }. A missing or revoked key returns 401 with key_not_found error. A read-only scoped key returns 403.
result: pass

### 4. List Service Requests with Pagination Headers
expected: GET /api/open311/requests returns a JSON array of service requests with X-Total-Count, X-Page, X-Page-Size, and X-Has-Next-Page response headers. Supports filtering by status, date range, and pagination params.
result: pass

### 5. Single Request Endpoint (Array Wrap)
expected: GET /api/open311/requests/{service_request_id} returns the ticket wrapped in a single-element array (not a bare object) — per GeoReport v2 spec. Returns 404 error format for unknown IDs.
result: pass

### 6. XML Content Negotiation
expected: Adding ?format=xml to any Open311 endpoint (e.g. GET /api/open311/services?format=xml) returns well-formed XML with a Content-Type of application/xml. Sending Accept: application/xml header also triggers XML output.
result: pass

### 7. GeoReport v2 Field Name Compliance
expected: Service request responses use exact GeoReport v2 field names: service_request_id, status (open or closed), lat, long (not lng), requested_datetime, updated_datetime as ISO strings.
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
cookie: n/a
per_test:
  - test: 1
    verdict: pass
    note: "🤖 Auto-check: GET /api/open311/services → HTTP 200, bare JSON array with 6 services, all required GeoReport v2 fields present."
  - test: 2
    verdict: pass
    note: "🤖 Auto-check: GET /api/open311/services/GRAFFITI → HTTP 200 with service definition + attributes array. GET /api/open311/services/INVALID_CODE → HTTP 404 with { errors: [{ code: 'service_not_found', ... }] }."
  - test: 3
    verdict: pass
    note: "🤖 Auto-check: POST with X-Api-Key: test-write-key-12345 → HTTP 201 with service_request_id. POST with no key → HTTP 401 key_not_found. POST with read-only key → HTTP 403 key_read_only."
  - test: 4
    verdict: pass
    note: "🤖 Auto-check: GET /api/open311/requests → HTTP 200 with headers X-Total-Count: 1, X-Page: 1, X-Page-Size: 20, X-Has-Next-Page: false."
  - test: 5
    verdict: pass
    note: "🤖 Auto-check: GET /api/open311/requests/{id} → HTTP 200, response is a single-element array (not bare object) — GeoReport v2 compliant."
  - test: 6
    verdict: pass
    note: "🤖 Auto-check: GET /api/open311/services?format=xml → well-formed XML with <services><service>...</service></services>. Accept: application/xml header also works."
  - test: 7
    verdict: pass
    note: "🤖 Auto-check: All 6 required fields present (service_request_id, status, lat, long, requested_datetime, updated_datetime). 'lng' field absent. status value is 'open'."

## Gaps

[none]
