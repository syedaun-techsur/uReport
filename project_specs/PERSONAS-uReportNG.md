# Persona Profiles
## uReport NG — City of Bloomington Municipal 311/CRM

| Field | Value |
|---|---|
| **Product Name** | uReport NG |
| **Project Acronym** | uReportNG |
| **Version** | 1.0 |
| **Date** | 2026-07-06 |
| **Related PRD** | PRD-uReportNG.md |
| **Status** | Active |

---

## Persona Summary

| ID | Name | Role | Primary Goal |
|---|---|---|---|
| PER-01 | Marcus Webb | Public Constituent | Report a local issue quickly from his phone and know it was received |
| PER-02 | Diane Kowalski | City Staff — 311 Coordinator | Work through the daily ticket queue efficiently and close issues without missing anything |
| PER-03 | Renata Osei | City Administrator | Keep the system correctly configured so staff can do their jobs without calling IT |
| PER-04 | Liam Tran | Third-Party Integrator | Consume the Open311 API reliably without changes to his existing integration code |

---

## PER-01: Marcus Webb

**Public Constituent**

### Role & Context

Marcus is a 34-year-old Bloomington resident who uses his Android phone for nearly everything. He has noticed a pothole on his street for two weeks and finally decided to report it after his neighbor mentioned the city has an app for that. He is not a regular user of city services online — he visits the water payment portal once a year at most. When he pulls up the city's issue-reporting page, he is standing on the sidewalk next to the pothole with mediocre cell service. He has roughly 90 seconds of patience before he puts his phone away.

Marcus represents the modal constituent interaction: a one-time or infrequent reporter who has no account, no training, and no tolerance for multi-step flows. A smaller but recurring subset of constituents like Marcus will later return to check whether their issue was acted on — usually because they haven't seen any visible change and want to know the city read their report.

### Goals

- Submit a report in under two minutes without creating an account (F0 — anonymous mode per category, map-first flow)
- Receive a confirmation that his report was received, with a ticket ID he can share or reference later (F0 — confirmation page with generated ticket ID)
- Check back on the ticket status a few days later without needing to log in (F1 — ticket lookup by ID, shareable URL)
- Optionally see other reported issues near his neighborhood to avoid reporting a duplicate (F1 — public issue map with clustering)

### Pain Points (traced to PRD Problem Statement)

- The legacy system has no responsive mobile-first interface — on a phone the report form is unusable in the field
- Anonymous submission is blocked on some categories even when it should be allowed, creating friction for constituents who don't want to share personal details for a pothole
- No accessible keyboard or screen-reader path for constituents with disabilities (WCAG 2.1 AA gap)
- After submitting, constituents have no lightweight way to confirm the ticket exists without calling 311 directly

### Technical Expertise

**Low-to-intermediate** — comfortable with consumer smartphone apps and basic web forms; unfamiliar with municipal systems; will not read instructions; expects behavior consistent with Google Maps or Uber.

### Top Tasks

1. Drop a map pin on the issue location or type an address — primary entry point (per-session, critical)
2. Select a service category and write a brief description (per-session, critical)
3. Optionally attach a photo taken on-device (per-session, high)
4. Submit and receive a confirmation with ticket ID (per-session, critical)
5. Look up ticket status by ID days later (occasional, medium)

### Success Criteria

- Complete a report submission in under 2 minutes on a mobile browser (PRD NFR: LCP < 2.5s on 4G)
- Submission success rate > 99% — no data loss on submit (PRD Success Metric)
- Ticket lookup by ID returns current status, substatus, and last-updated date without login
- Lighthouse Accessibility score ≥ 90 on the public portal (PRD Success Metric)

---

## PER-02: Diane Kowalski

**City Staff — 311 Coordinator**

### Role & Context

Diane is a senior 311 coordinator in Bloomington's Public Works department. She has worked for the city for nine years and used the legacy uReport system since it launched. She manages roughly 60–80 open tickets at any given time across multiple categories — potholes, fallen trees, sign damage, illegal dumping — and coordinates with three junior staff members who handle first-response triage. Each morning she spends 30–45 minutes triaging the overnight queue before her phone starts ringing.

Her biggest daily frustration with the legacy system is that she can't reliably filter her view to just the tickets assigned to her department, search the description text to find related reports, or save a queue configuration so she doesn't have to re-enter the same six filters every morning. She also loses time hunting for constituent contact history when a caller claims they reported an issue weeks ago but she can't locate the original ticket.

Diane represents the majority of staff users — experienced municipal workers who are not technically sophisticated but have deep domain knowledge of how 311 workflows should behave. She is cautious about new software but will adopt it quickly if it proves faster than what she's replacing.

### Goals

- Start every morning with a pre-filtered queue showing only her department's open tickets, without re-entering filter settings each day (F3 — Bookmarked saved filters)
- Find a ticket in under 30 seconds using a keyword, address, or partial description (F3 — Postgres FTS full-text search)
- Update a ticket's status, add a public-facing note, and close it in a single screen without switching tools (F4 — ticket detail with status selector, templated responses, history timeline)
- Link a caller's complaint to their existing contact record and see all prior tickets they've submitted (F5 — CRM People management, contact history)
- Understand her team's workload at a glance — how many tickets are open by category and how long they've been sitting (F8 — Reports & Metrics dashboard)

### Pain Points (traced to PRD Problem Statement)

- Legacy staff queue has no full-text search — finding a ticket requires knowing its ID or exact address
- No saved filter views — Diane re-enters the same six filters every morning
- CRM/People module is rudimentary — she cannot reliably pull up a constituent's history when they call back
- No bulk update capability — closing 15 resolved pothole tickets after a repaving project requires editing each one individually
- No map view of the queue — she cannot visualize where clusters of open issues are concentrated

### Technical Expertise

**Intermediate** — fluent with web-based line-of-business applications (permitting software, GIS viewers, email); comfortable with filtering and sorting; avoids command-line tools or anything that requires configuration changes; expects behavior consistent with Salesforce or a modern CRM.

### Top Tasks

1. Open saved "My Department — Open" bookmark and review overnight queue (daily, critical)
2. Search tickets by keyword or address to locate a specific report (daily, high)
3. Update status/substatus, add a staff note or templated response on a ticket (daily, critical)
4. Bulk-close or bulk-reassign a set of resolved tickets (weekly, high)
5. Pull a constituent's full ticket history when they call (several times/week, high)
6. Review weekly volume and resolution-time metrics for her team (weekly, medium)

### Success Criteria

- Generate a filtered, saved queue view in under 2 minutes on first setup; zero setup time on subsequent mornings (PRD Success Metric: staff can save and share queue filters without engineering)
- Full-text search query returns results in < 500ms p95 (PRD NFR)
- Can open, update, and close a ticket in under 90 seconds in the ticket detail view
- Staff ticket queue adoption > 90% within 30 days of launch (PRD Success Metric)

---

## PER-03: Renata Osei

**City Administrator — IT/Operations**

### Role & Context

Renata is a city IT systems administrator who owns the uReport platform operationally. She is the person staff call when a category is misconfigured, when a new department needs to be added, or when a third-party mobile app vendor asks for an API key. She typically makes 3–5 configuration changes per month — adding a seasonal service category, deactivating a legacy department, creating a new staff account when someone is hired, or generating an API key for a new integration partner.

Renata is not a developer, but she is technically sophisticated: she manages the city's Kubernetes infrastructure, understands environment variables and pod restarts, and has operated the legacy PHP system for years. Her core requirement is that routine configuration changes — categories, departments, users, API keys — are doable through the admin UI without requiring a code deployment or a call to the vendor. Every time a code change is required to update a dropdown, she loses half a day.

She also acts as the system auditor: when a constituent complaint escalates, she reviews the ticket history and audit trail. When a new Open311 integration partner goes live, she generates an API key with limited scope and monitors its last-used timestamp.

### Goals

- Add or deactivate service categories and departments through a UI without touching code or restarting the pod (F6 — Category and Department management, PRD Success Metric: admin adds category without code deployment)
- Create, deactivate, and reset passwords for staff accounts without contacting a developer (F6 — User/role management)
- Generate a scoped API key for a new integration partner, and revoke it immediately if they go off-spec (F6 — Open311 API key management; PRD Success Metric: admin creates/revokes API key via UI)
- Review API key last-used timestamps to audit active integrations (F6 — last-used timestamp display)
- Configure per-category anonymity settings and Open311 `service_code` mappings to match the GeoReport v2 spec (F6 — category configuration)

### Pain Points (traced to PRD Problem Statement)

- Legacy system has no API key management — Renata cannot issue scoped credentials to integrators or revoke them without a database change
- Configuration changes (categories, departments) require code modifications or direct DB access on the legacy stack
- No audit trail on admin actions — when something breaks, there is no log of who changed what and when
- Staff account lifecycle (create, deactivate, reset password) requires developer access in the legacy system

### Technical Expertise

**High** — Kubernetes operator, comfortable with environment variables, database concepts, and REST APIs; reads API documentation; does not write application code but can interpret error logs and understand system behavior.

### Top Tasks

1. Create or deactivate a service category (including Open311 service_code, icon, anonymity setting) (monthly, high)
2. Create a new staff account or deactivate a departing employee's account (monthly, high)
3. Generate a new API key for an integration partner and set its scope (quarterly, high)
4. Revoke or audit existing API keys — check last-used timestamps (as-needed, medium)
5. Configure response templates for new categories (occasional, medium)
6. Review audit trail on a specific ticket or admin action during escalation (as-needed, medium)

### Success Criteria

- Complete a new category creation end-to-end in under 5 minutes without a code deployment (PRD Success Metric)
- Create, issue, and revoke an API key entirely within the admin UI — zero database commands required (PRD Success Metric)
- New staff account is created and active within 2 minutes; no developer involvement
- All admin configuration changes are reflected in the live system immediately (no pod restart required for reference data)

---

## PER-04: Liam Tran

**Third-Party Integrator**

### Role & Context

Liam is a backend developer at a civic technology firm that maintains a cross-city 311 mobile app aggregator — a consumer app that lets residents of multiple municipalities report issues from one interface. His app has been integrated with Bloomington's uReport system for three years via the Open311 GeoReport v2 API. His integration code runs in production for thousands of daily users across several cities, and he has zero tolerance for breaking changes in the Bloomington endpoint.

Liam's interaction with uReport NG is entirely programmatic — he will never log into the admin panel or touch the web UI. His contract with the city requires the API to keep working without changes to his client code. He depends on exact field names (`service_request_id`, `lat`, `long`, `requested_datetime`), both JSON and XML response formats, the `api_key` query parameter for write endpoints, and stable pagination behavior (`page_size`, `page`). Any field rename or response structure change breaks his app in production.

Liam also represents the pattern of a city-internal developer who might build lightweight dashboards or data pipelines on top of the Open311 feed — consuming `GET /api/v2/requests` with status/date/bbox filters to feed a GIS visualization or a nightly data warehouse sync.

### Goals

- Submit new service requests via `POST /api/v2/requests` using an API key and receive a `service_request_id` that his app can poll (F7 — Open311 POST endpoint, API key auth)
- Query open requests by service code, status, and date range to sync his local cache (F7 — `GET /api/v2/requests` with filters)
- Retrieve individual request status to display in his app without re-querying the full list (F7 — `GET /api/v2/requests/{id}`)
- Receive a scoped, revocable API key from Renata when a new integration goes live (F6 — API key management)
- Get both JSON and XML responses depending on which format his downstream pipeline requires (F7 — content negotiation)

### Pain Points (traced to PRD Problem Statement)

- Legacy system has no formal API key management — Liam currently uses a shared, unscoped credential that cannot be revoked without breaking all integrations simultaneously
- No rate-limit feedback on the legacy API — his client has no way to detect throttling vs. server errors
- Open311 field names are inconsistently cased in some legacy responses, requiring defensive client-side normalization
- No pagination on the legacy `GET /requests` endpoint — large corpora cause response timeouts

### Technical Expertise

**Expert** — senior backend developer fluent in REST API design, HTTP semantics, JSON/XML parsing, auth patterns (API keys, OAuth); reads and implements against formal specs; will file a bug report if a response deviates from the GeoReport v2 specification.

### Top Tasks

1. `POST /api/v2/requests` to submit a constituent's report on their behalf (high-frequency, critical)
2. `GET /api/v2/requests?service_code=&status=open&start_date=` to sync new or updated tickets (scheduled, high)
3. `GET /api/v2/requests/{id}` to poll a specific ticket for status changes (on-demand, high)
4. `GET /api/v2/services` to refresh his local service category list when new categories are added (periodic, medium)
5. Authenticate using `api_key` query param on write endpoints; handle 401 cleanly on key expiry (per-request, critical)

### Success Criteria

- 100% of active Open311 integrations continue to function after cutover — zero field-level regressions (PRD Success Metric)
- GeoReport v2 field names match spec exactly: `service_request_id`, `lat`, `long`, `requested_datetime`, `service_code`, `status` — verified by contract tests in CI (PRD Risk Mitigation)
- Both `format=json` (default) and `format=xml` responses parse correctly by existing client code
- `GET /api/v2/requests` supports `page` and `page_size` parameters — no response timeouts on large corpora
- Rate-limit responses return HTTP 429 with `Retry-After` header (actionable by client)

---

## Persona Relationships

| | PER-01 Marcus (Constituent) | PER-02 Diane (Staff) | PER-03 Renata (Admin) | PER-04 Liam (Integrator) |
|---|---|---|---|---|
| **PER-01 Marcus** | — | Diane receives and resolves Marcus's tickets; may send him a public note | Renata configures the categories Marcus sees; controls whether his category allows anonymous submission | Liam's app may submit reports on Marcus's behalf via the Open311 API |
| **PER-02 Diane** | Manages and responds to tickets submitted by Marcus | — | Renata creates Diane's account, sets her department, and configures the templates she uses | Liam's API submissions land in Diane's queue like any other ticket |
| **PER-03 Renata** | Configures the system Marcus uses | Creates and manages Diane's account; configures her department and categories | — | Generates and revokes the API keys Liam uses; audits his integration's last-used timestamp |
| **PER-04 Liam** | Submits and tracks reports on behalf of residents like Marcus | His API submissions appear in Diane's queue; no direct interaction | Contacts Renata to request API keys and report spec issues | — |

---

## Feature-Persona Matrix

| Feature ID | Feature Name | PER-01 Constituent | PER-02 Staff | PER-03 Admin | PER-04 Integrator |
|---|---|---|---|---|---|
| **F0** | Public Constituent Portal | **Primary** | None | None | None |
| **F1** | Constituent Issue Tracking | **Primary** | Secondary | None | Secondary |
| **F2** | Authentication & Role-Based Sessions | None | **Primary** | **Primary** | Secondary (API key auth) |
| **F3** | Staff Ticket Queue | None | **Primary** | Secondary | None |
| **F4** | Staff Ticket Detail | None | **Primary** | Secondary | None |
| **F5** | Staff CRM / People Management | None | **Primary** | Secondary | None |
| **F6** | Admin Panel | None | Secondary | **Primary** | Secondary (API key lifecycle) |
| **F7** | Open311 GeoReport v2 API | Secondary (indirect via F0) | None | Secondary (key config) | **Primary** |
| **F8** | Reports & Metrics Dashboard | None | **Primary** | **Primary** | None |
| **F9** | Infrastructure & Platform | None | None | **Primary** | Secondary (reliability) |

**Legend:**  
- **Primary** — this persona's core workflow depends on this feature  
- **Secondary** — this persona benefits from or is indirectly affected by this feature  
- None — this feature is not relevant to this persona's goals

---

*Document owner: uReport NG Project Team*  
*Derived from: PRD-uReportNG.md (Section 2, 5, 7, 9)*  
*Downstream consumers: FRD-uReportNG.md, UserStories-uReportNG.md, UX/design briefs*
