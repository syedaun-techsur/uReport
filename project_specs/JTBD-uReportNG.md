# Jobs-to-be-Done Document
## uReport NG — City of Bloomington Municipal 311/CRM

| Field | Value |
|---|---|
| **Product Name** | uReport NG |
| **Project Acronym** | uReportNG |
| **Version** | 1.0 |
| **Date** | 2026-07-06 |
| **Related Personas** | PERSONAS-uReportNG.md |
| **Related PRD** | PRD-uReportNG.md |
| **Status** | Active |

---

## JTBD Summary Table

| JTBD-ID | Persona | Job Statement (abbreviated) | Priority |
|---|---|---|---|
| JTBD-01.1 | PER-01 Marcus Webb | Report a local issue from my phone in under 2 minutes without an account | P0 |
| JTBD-01.2 | PER-01 Marcus Webb | Verify my submission was received and check its status days later without logging in | P0 |
| JTBD-01.3 | PER-01 Marcus Webb | Avoid filing a duplicate report by seeing what's already been reported near me | P1 |
| JTBD-02.1 | PER-02 Diane Kowalski | Start every morning with my filtered department queue ready without re-entering settings | P0 |
| JTBD-02.2 | PER-02 Diane Kowalski | Find, update, and close a specific ticket in under 90 seconds without switching tools | P0 |
| JTBD-02.3 | PER-02 Diane Kowalski | Understand team workload and locate a caller's full history in under 30 seconds | P1 |
| JTBD-03.1 | PER-03 Renata Osei | Change system configuration — categories, departments, users — without a code deployment | P0 |
| JTBD-03.2 | PER-03 Renata Osei | Issue, scope, and revoke API credentials for integrators entirely within the admin UI | P0 |
| JTBD-03.3 | PER-03 Renata Osei | Audit what changed in the system and who changed it during an escalation | P1 |
| JTBD-04.1 | PER-04 Liam Tran | Submit and retrieve service requests via Open311 API without changing existing integration code | P0 |
| JTBD-04.2 | PER-04 Liam Tran | Sync and paginate large request corpora reliably without timeouts or field-name surprises | P0 |
| JTBD-04.3 | PER-04 Liam Tran | Receive actionable error signals — 401, 429 with Retry-After — to handle auth and throttling cleanly | P1 |

---

## PER-01: Marcus Webb — Public Constituent

---

### JTBD-01.1: Report an Issue from the Field

**Job Statement:**
When I notice a problem on my street and have my phone in hand with moderate cell service, I want to drop a pin, pick a category, and describe the issue without creating an account, so I can get the report to the city before I lose interest or walk away.

**Current Alternatives:**
- Calls 311 directly and waits on hold
- Emails the city and never receives acknowledgment
- Posts to a neighborhood social media group hoping someone sees it
- Attempts the legacy web form, gives up after the first non-mobile screen

**Hiring Criteria:**
- Map loads within 3 seconds on a 4G connection; pin placement works without a full address
- Category picker is visible and operable without zooming in
- Anonymous submission is supported for common categories (e.g., potholes) — no account required
- Confirmation appears on the same screen after submit; no redirect maze
- Entire flow completable in under 2 minutes on a mid-range Android browser

**Success Measure:** A first-time constituent on a mobile browser completes a full report submission — pin, category, description, submit — in under 120 seconds with a >99% success rate (no data loss).

**Related Features:** F0, F2
**Priority:** P0

---

### JTBD-01.2: Confirm Receipt and Check Status Later

**Job Statement:**
When I've submitted a report and return a few days later curious whether anything happened, I want to look up my ticket by its ID and see current status and any staff notes, so I can know the city received my report without calling 311 to verify.

**Current Alternatives:**
- Calls 311 and recites the address, hoping an agent can find the ticket
- Returns to the submission page and re-submits the same issue, creating duplicates
- Accepts uncertainty and never follows up
- Bookmarks the submission confirmation page (which the legacy system doesn't provide)

**Hiring Criteria:**
- Ticket lookup is available at a public URL requiring no login
- Result displays category, status, substatus, last-updated date, and any public staff notes
- A shareable deep-link URL allows the constituent to return directly without re-entering the ID
- Page loads and displays results in under 3 seconds on mobile

**Success Measure:** A constituent who enters a valid ticket ID on the public lookup page receives full status, substatus, and last-updated date within 3 seconds — zero authentication required.

**Related Features:** F1
**Priority:** P0

---

### JTBD-01.3: Check for Existing Reports Before Submitting

**Job Statement:**
When I'm about to report an issue, I want to see whether anyone else has already reported the same or nearby problems, so I can avoid filing a duplicate and trust that the city is already aware.

**Current Alternatives:**
- Has no way to check existing reports on the legacy system's public-facing surface
- Files the duplicate anyway because there's no feedback mechanism
- Searches the city website and finds nothing useful

**Hiring Criteria:**
- A public map shows open issue clusters without login
- Clusters expand on zoom to reveal individual ticket summaries
- Map is accessible by keyboard and screen reader (WCAG 2.1 AA)
- Individual ticket popups show enough detail (category, status, date) to confirm it's the same issue

**Success Measure:** A constituent can visually identify whether their location already has an open ticket of the same category within 30 seconds of opening the public map, without login.

**Related Features:** F1
**Priority:** P1

---

## PER-02: Diane Kowalski — City Staff 311 Coordinator

---

### JTBD-02.1: Start the Morning with a Ready-to-Work Queue

**Job Statement:**
When I sit down at my desk each morning and open the staff portal, I want my department's ticket queue to appear pre-filtered and sorted exactly as I configured it yesterday, so I can begin triaging the overnight backlog in seconds instead of re-entering six filters by hand.

**Current Alternatives:**
- Re-enters the same six filter conditions each morning in the legacy system
- Maintains a personal cheat sheet with the exact filter sequence
- Uses a saved browser bookmark to a URL with partial filter state — breaks on session expiry
- Asks a junior staff member to set it up while she handles incoming calls

**Hiring Criteria:**
- Saved filter views ("Bookmarks") persist across sessions per staff user
- Opening a Bookmark loads the exact filter state — category, department, status, date range, assignee — in a single click
- Queue displays count of tickets and last-refresh timestamp to confirm it's current
- First-time setup takes under 2 minutes; zero setup time on return visits

**Success Measure:** After initial Bookmark setup, Diane's filtered department queue is fully loaded and displayed within 5 seconds of clicking the Bookmark — zero manual filter re-entry on subsequent mornings.

**Related Features:** F3, F2
**Priority:** P0

---

### JTBD-02.2: Find, Update, and Close a Ticket Without Switching Tools

**Job Statement:**
When a specific ticket needs my attention — whether found by search, from a caller, or flagged by a colleague — I want to open it, update status and add a public note, and close it in a single screen interaction, so I can move through my queue efficiently without losing context or switching between applications.

**Current Alternatives:**
- Searches by ticket ID only — requires knowing the exact ID; no description search
- Opens the ticket in one tab, composes a reply email in another, updates status manually in a third field
- Uses templated responses saved in a separate shared Word document that must be copy-pasted
- Bulk-closes tickets one at a time when repaving clears a set of pothole reports

**Hiring Criteria:**
- Full-text search returns results within 500ms p95 across title, description, and address
- Ticket detail screen contains: status/substatus selector, templated response insertion, public note field, and history timeline — no navigation away required
- Bulk status update applies to a selected set of tickets from the queue in a single action
- Changes are saved and reflected in the queue immediately (no page reload required)

**Success Measure:** Diane can locate a ticket via free-text search, update its status, add a public-facing response note using a saved template, and close it — all within 90 seconds — without leaving the ticket detail screen.

**Related Features:** F3, F4
**Priority:** P0

---

### JTBD-02.3: Know Team Workload and Surface Caller History Instantly

**Job Statement:**
When a constituent calls back about a previous report or when I need to understand how my team's queue is distributed across categories and age, I want to pull up a constituent's full ticket history or a workload summary in under 30 seconds, so I can respond credibly to the caller and manage team capacity without running manual counts.

**Current Alternatives:**
- Searches by caller's name in the legacy system — often returns nothing or too many results
- Asks the caller for their original ticket ID and manually looks it up
- Keeps a personal tally of open tickets by category in a spreadsheet updated weekly
- Relies on her manager's monthly report, which is always 2–3 weeks stale

**Hiring Criteria:**
- Person (CRM) record is searchable by name, email, or phone number; returns results in < 500ms
- Contact history view shows all tickets ever linked to a Person with status, dates, and category
- Reports & Metrics dashboard shows open ticket count by category and department with configurable date range
- Average resolution time is visible per category without custom query

**Success Measure:** When a constituent calls and provides their name or phone number, Diane locates their full ticket history within 30 seconds using CRM People search — without the caller reciting a ticket ID.

**Related Features:** F5, F8
**Priority:** P1

---

## PER-03: Renata Osei — City Administrator

---

### JTBD-03.1: Change System Configuration Without a Code Deployment

**Job Statement:**
When the city adds a seasonal service category, restructures a department, or hires a new staff member, I want to make all required configuration changes through the admin UI and have them take effect immediately, so I can keep the system accurate without blocking on a developer or scheduling a deployment window.

**Current Alternatives:**
- Files a ticket with the vendor to update categories — average turnaround 3–5 business days
- Makes direct database changes in the legacy system — high risk, no audit trail
- Manually edits configuration files and triggers a pod restart
- Leaves categories active after they're obsolete because deactivation requires a code change

**Hiring Criteria:**
- Categories, departments, and substatuses are fully manageable (create/edit/deactivate) from the admin UI
- Changes appear in the public portal and staff queue immediately — no pod restart, no code deploy
- User accounts (create, deactivate, reset password) are manageable without developer access
- Admin UI is usable without reading documentation; clear labels and confirmation dialogs

**Success Measure:** Renata creates a new service category — including service_code, icon, department link, and anonymity setting — and confirms it is live in the public portal in under 5 minutes, with zero code deployments or pod restarts.

**Related Features:** F6, F2
**Priority:** P0

---

### JTBD-03.2: Issue and Revoke API Credentials Without Database Commands

**Job Statement:**
When a new integration partner goes live or an existing one needs to be cut off due to a contract change or spec violation, I want to generate a scoped API key or revoke an existing one entirely within the admin UI, so I can control integrator access instantly without touching the database or calling a developer.

**Current Alternatives:**
- Issues the same shared, unscoped credential to all integrators — revoking it breaks all integrations simultaneously
- Rotates credentials by deploying a new environment variable — requires a pod restart and developer involvement
- Has no visibility into when a given credential was last used — cannot audit dormant keys
- Cannot scope a key to read-only — all API keys have write access

**Hiring Criteria:**
- API key generation produces a labeled, scoped (read-only or write) key displayed once at creation
- Revocation takes immediate effect — subsequent API calls with the revoked key return 401
- Last-used timestamp is visible on each key's admin row without additional clicks
- Zero database commands required for any key lifecycle operation

**Success Measure:** Renata generates a new scoped API key, shares it with the integration partner, and later revokes it — all without any database commands or developer contact — and can see the last-used timestamp on every active key from the admin panel.

**Related Features:** F6, F7
**Priority:** P0

---

### JTBD-03.3: Audit Admin and Ticket Activity During Escalations

**Job Statement:**
When a constituent complaint escalates to city management or when a configuration change appears to have broken something, I want to review a chronological audit trail of who changed what and when, so I can identify the root cause and demonstrate accountability without reconstructing events from email threads.

**Current Alternatives:**
- Has no audit log on the legacy system — changes are invisible until their effects surface
- Reviews email threads between staff members to reconstruct the sequence of events
- Asks individual staff members what they changed — relies on memory and goodwill
- Cannot determine whether a configuration change or a staff action caused the issue

**Hiring Criteria:**
- Ticket history timeline shows all status changes, assignments, and notes with actor name and timestamp
- Admin actions (category edits, user creation, API key generation/revocation) are logged with actor and timestamp
- Audit view is filterable by ticket ID or admin action type
- Audit records are append-only and cannot be edited by any role

**Success Measure:** During an escalation, Renata can pull the complete audit trail for a specific ticket or admin action — showing every change, actor, and timestamp — within 2 minutes of opening the admin panel.

**Related Features:** F4, F6, F8
**Priority:** P1

---

## PER-04: Liam Tran — Third-Party Integrator

---

### JTBD-04.1: Submit and Retrieve Service Requests Without Changing Integration Code

**Job Statement:**
When my app submits a service request on a constituent's behalf or retrieves the status of a previously filed ticket, I want the API to accept and return data using the exact GeoReport v2 field names and formats my code already expects, so I can confirm the Bloomington endpoint keeps working after the platform migration without modifying a single line of client code.

**Current Alternatives:**
- Has no pre-migration test environment to verify field-level compatibility before cutover
- Maintains defensive client-side normalization to handle inconsistent field casing in legacy responses
- Relies on informal assurances from the city that "the API won't change" — no contractual validation
- Uses a shared credential that cannot be scoped or rotated without affecting all integrations

**Hiring Criteria:**
- `POST /api/v2/requests` accepts `api_key`, `service_code`, `lat`, `long`, `description`, and returns `service_request_id` in the exact GeoReport v2 field names
- `GET /api/v2/requests/{service_request_id}` returns all required v2 fields with correct names and types
- Both `format=json` (default) and `format=xml` responses parse correctly against existing client parsers
- API key is scoped, revocable, and passed as `api_key` query parameter on write endpoints

**Success Measure:** 100% of Liam's existing integration test suite passes against the new endpoint without any client-side code modifications — verified by GeoReport v2 contract tests in CI before cutover.

**Related Features:** F7, F6
**Priority:** P0

---

### JTBD-04.2: Sync and Paginate Large Ticket Corpora Without Timeouts

**Job Statement:**
When my scheduled sync job queries Bloomington's open requests by service code, status, and date range to refresh my local cache, I want the endpoint to return paginated results quickly and predictably, so I can keep my app's data current without hitting response timeouts or receiving truncated datasets.

**Current Alternatives:**
- The legacy `GET /requests` endpoint has no pagination — large date ranges cause response timeouts
- Implements client-side retry loops with exponential backoff to handle silent timeouts
- Reduces query date range to avoid timeouts, resulting in stale or incomplete sync data
- Uses an unofficial workaround of querying by individual service code to keep result sets small

**Hiring Criteria:**
- `GET /api/v2/requests` supports `page` and `page_size` query parameters with documented defaults
- Filtering by `service_code`, `status`, `start_date`, and `end_date` works correctly and reduces result set as expected
- Response time for a paginated query (e.g., 50 results) is < 2 seconds under normal load
- Pagination metadata conveyed via response headers: `X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Has-Next-Page` — response body remains a raw GeoReport v2 array (spec-compliant; existing clients unaffected)

**Success Measure:** Liam's nightly sync job completes a full dataset refresh using paginated `GET /api/v2/requests` queries — with no timeouts and no missing records — within the scheduled window.

**Related Features:** F7
**Priority:** P0

---

### JTBD-04.3: Handle Auth Failures and Rate Limits Without Silent Failures

**Job Statement:**
When my integration encounters a revoked API key or hits the server's rate limit, I want to receive a well-formed HTTP error response with enough context to react correctly in code, so I can surface a meaningful error to my app's retry logic without misclassifying throttling as a server outage.

**Current Alternatives:**
- The legacy API returns inconsistent HTTP status codes — throttling looks identical to a 500 error
- Has no `Retry-After` header to guide backoff timing — implements arbitrary wait intervals
- API key expiry returns a generic error with no indication that re-auth is needed
- Monitoring dashboards show false server-error spikes caused by undetected throttling

**Hiring Criteria:**
- A missing or invalid API key on a write endpoint returns HTTP 401 with a machine-readable error body
- Rate-limited requests return HTTP 429 with a `Retry-After` header indicating seconds until retry is safe
- Error response bodies are valid JSON (or XML when `format=xml`) with a consistent structure
- HTTP status codes match standard semantics — 401 for auth, 429 for rate limit, 5xx for server errors

**Success Measure:** Liam's integration code, without modification, correctly distinguishes an auth failure (401) from a rate-limit (429 with `Retry-After`) from a server error (5xx) — enabling automated retry logic with zero false server-outage alerts.

**Related Features:** F7, F6
**Priority:** P1

---

## Outcome-to-Feature Traceability

| JTBD-ID | Feature ID | Feature Name | Expected Outcome |
|---|---|---|---|
| JTBD-01.1 | F0 | Public Constituent Portal | Constituent completes report in < 2 min, mobile, no account required |
| JTBD-01.1 | F2 | Auth & Role-Based Sessions | Anonymous (public) role flows through without forced login |
| JTBD-01.2 | F1 | Constituent Issue Tracking | Ticket lookup by ID returns full status, substatus, last-updated; shareable URL |
| JTBD-01.3 | F1 | Constituent Issue Tracking | Public map shows clustered open tickets; individual popups confirm category and status |
| JTBD-02.1 | F3 | Staff Ticket Queue | Saved Bookmarks restore full filter state; zero re-entry on subsequent sessions |
| JTBD-02.1 | F2 | Auth & Role-Based Sessions | Staff session persists Bookmark associations per authenticated user |
| JTBD-02.2 | F3 | Staff Ticket Queue | FTS returns results < 500ms p95; bulk actions available on selected rows |
| JTBD-02.2 | F4 | Staff Ticket Detail | Single screen contains status selector, template insertion, note field, and timeline |
| JTBD-02.3 | F5 | Staff CRM / People Management | Person search by name/email/phone returns contact history in < 500ms |
| JTBD-02.3 | F8 | Reports & Metrics Dashboard | Open ticket count by category and avg resolution time visible without custom query |
| JTBD-03.1 | F6 | Admin Panel | Category/dept/user changes take effect immediately; zero deploy required |
| JTBD-03.1 | F2 | Auth & Role-Based Sessions | Admin role gates access to all configuration screens |
| JTBD-03.2 | F6 | Admin Panel | API key generation, scoping, last-used timestamp, and revocation fully in UI |
| JTBD-03.2 | F7 | Open311 GeoReport v2 API | Revoked key returns 401 immediately on next API call |
| JTBD-03.3 | F4 | Staff Ticket Detail | Ticket history timeline is append-only; shows every actor, action, and timestamp |
| JTBD-03.3 | F6 | Admin Panel | Admin action log captures category/user/API key changes with actor and timestamp |
| JTBD-03.3 | F8 | Reports & Metrics Dashboard | Audit data queryable by ticket ID or action type within 2 minutes |
| JTBD-04.1 | F7 | Open311 GeoReport v2 API | POST and GET return exact GeoReport v2 field names; JSON + XML content negotiation |
| JTBD-04.1 | F6 | Admin Panel | Scoped, labeled API key issued and tied to integrator identity |
| JTBD-04.2 | F7 | Open311 GeoReport v2 API | Paginated GET /requests with service_code, status, date filters; < 2s response |
| JTBD-04.3 | F7 | Open311 GeoReport v2 API | 401 on invalid key; 429 with Retry-After on rate limit; consistent error body |
| JTBD-04.3 | F6 | Admin Panel | Revoked API key produces 401 immediately on next request |
| — | F9 | Infrastructure & Platform | Platform constraint: single pod, Postgres sidecar, health probes — underpins all JTBD |

---

## NaC Preview

Natural Acceptance Criteria candidates — to be refined in STORY-MAP and FRD.

| JTBD-ID | Outcome | Candidate Natural Acceptance Criterion |
|---|---|---|
| JTBD-01.1 | Report completed in < 2 min on mobile, no account | Given a first-time visitor on a mobile browser, when they submit a report with a map pin, category, and description, then a confirmation page with a unique ticket ID appears within 120 seconds of page load — with no account creation required and no data loss. |
| JTBD-01.2 | Ticket status visible by ID, no login | Given a valid ticket ID, when entered on the public lookup page, then status, substatus, last-updated date, and any public staff notes are displayed within 3 seconds — no authentication required. |
| JTBD-01.3 | Duplicate-check via public map | Given the public issue map, when a constituent zooms to their location, then open ticket clusters expand to show individual issue summaries — operable by keyboard and meeting WCAG 2.1 AA color contrast. |
| JTBD-02.1 | Saved Bookmark restores full queue in ≤ 5s | Given a staff user who saved a Bookmark yesterday, when they click it on login today, then the exact filter set is applied and the filtered ticket list is fully loaded within 5 seconds — zero filter re-entry required. |
| JTBD-02.2 | Ticket found, updated, and closed in ≤ 90s | Given a staff user running a free-text search, when they open a result, update status, insert a template response, and click Save, then the updated ticket appears in the queue immediately and the entire interaction completes in under 90 seconds. |
| JTBD-02.2 | Bulk close reflected immediately | Given a staff user with 10 tickets selected in the queue, when they apply a bulk status change, then all 10 tickets reflect the new status in the queue view without a page reload. |
| JTBD-02.3 | Caller history found in < 30s | Given a staff user who receives a caller's name and phone number, when they search in the CRM People view, then the caller's full ticket history is displayed within 30 seconds — with no ticket ID required from the caller. |
| JTBD-03.1 | New category live in < 5 min, no deploy | Given an admin who creates a new category in the Admin Panel, when they save it, then the category appears in the public portal's category picker within 60 seconds — with no code deployment or pod restart. |
| JTBD-03.2 | API key revoked; next call returns 401 | Given an admin who revokes an API key in the Admin Panel, when the integrator's next API write request arrives, then it returns HTTP 401 — immediately, without a pod restart, and without breaking any other active API keys. |
| JTBD-03.3 | Full audit trail retrieved in < 2 min | Given an escalation on a specific ticket, when Renata opens the ticket history timeline and the admin action log, then every status change, actor, and timestamp for that ticket is visible and the audit is complete within 2 minutes. |
| JTBD-04.1 | GeoReport v2 field names exact; JSON + XML parse | Given Liam's existing GeoReport v2 contract test suite, when run against the new endpoint, then 100% of field-name assertions pass — with no client-side code changes — for both JSON and XML response formats. |
| JTBD-04.2 | Paginated sync completes; no timeouts | Given a sync job querying GET /api/v2/requests with pagination, when it iterates through all pages for a given service_code and date range, then every response returns within 2 seconds and the complete dataset is returned with no missing records. |
| JTBD-04.3 | 401 and 429 with Retry-After are distinct | Given a revoked API key, when used on a write endpoint, then HTTP 401 is returned. Given a rate-limited client, when the limit is exceeded, then HTTP 429 is returned with a Retry-After header — distinct from any 5xx server error. |

---

*Document owner: uReport NG Project Team*
*Derived from: PERSONAS-uReportNG.md, PRD-uReportNG.md, .planning/PROJECT.md*
*Downstream consumers: FRD-uReportNG.md, STORY-MAP-uReportNG.md, UserStories-uReportNG.md*
