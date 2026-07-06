# User Journey Maps
## uReport NG — City of Bloomington Municipal 311/CRM

| Field | Value |
|---|---|
| **Product Name** | uReport NG |
| **Project Acronym** | uReportNG |
| **Version** | 1.0 |
| **Date** | 2026-07-06 |
| **Related Personas** | PERSONAS-uReportNG.md |
| **Related JTBD** | JTBD-uReportNG.md |
| **Related PRD** | PRD-uReportNG.md |
| **Status** | Active |

---

## Journey Index

| JRN-ID | Persona | Scenario | Key JTBD | Stages |
|---|---|---|---|---|
| JRN-01.1 | PER-01 Marcus Webb | Report a pothole anonymously on mobile | JTBD-01.1 | 5 |
| JRN-01.2 | PER-01 Marcus Webb | Check ticket status days later without logging in | JTBD-01.2 | 4 |
| JRN-02.1 | PER-02 Diane Kowalski | Morning queue triage with saved Bookmark | JTBD-02.1 | 5 |
| JRN-02.2 | PER-02 Diane Kowalski | Find, update, and close a ticket in under 90 seconds | JTBD-02.2 | 5 |
| JRN-03.1 | PER-03 Renata Osei | Create a new service category without a code deployment | JTBD-03.1 | 5 |
| JRN-03.2 | PER-03 Renata Osei | Issue and revoke an API key for a new integration partner | JTBD-03.2 | 5 |
| JRN-04.1 | PER-04 Liam Tran | POST a new service request via Open311 API | JTBD-04.1 | 4 |
| JRN-04.2 | PER-04 Liam Tran | Poll and paginate service requests for nightly sync | JTBD-04.2, JTBD-04.3 | 5 |

---

## PER-01 Journeys — Marcus Webb (Public Constituent)

---

### JRN-01.1: Report a Pothole Anonymously on Mobile

**Persona:** PER-01 (Marcus Webb)

**Scenario:** Marcus is standing on the sidewalk next to a pothole he's been meaning to report for two weeks. His neighbor just mentioned the city has a web form. He opens his Android browser, navigates to the city's reporting page, and attempts to file a report in under two minutes — without creating an account, while standing outside on mediocre cell service.

**Related JTBD:** JTBD-01.1

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1 · Discover** | Types "Bloomington report pothole" into mobile browser; taps city website link | External search → city website (F0) | "Is this going to be some huge form? I just want to tell them there's a hole." | Tentative, low-expectation | City website SEO may not surface the portal top-of-results; extra navigation step before the form loads | Deep-link the portal from city homepage with a prominent "Report an Issue" CTA; ensure LCP < 2.5s on 4G |
| **2 · Orient** | Public portal loads; sees full-screen Leaflet map centered on Bloomington | F0 — Map-first portal | "Oh, it's a map. I can just tap where the pothole is." | Mildly surprised, engaged | If map takes > 3s to load on 4G he closes the tab; tile load order matters | Show map skeleton immediately; defer tile fetch behind Intersection Observer; display "Tap to place pin" tooltip on first load |
| **3 · Locate** | Pinches to zoom street level; long-presses pothole location to drop pin; or types address in search box | F0 — Map pin drop / address search | "That's it, right about there. Or should I type the address?" | Focused, slightly rushed | Precise pin drop on mobile is fiddly; fat-finger error rate is high at city-block zoom | Snap pin to nearest address and confirm with "Looks right?" inline confirmation; offer address autocomplete as parallel input |
| **4 · Describe** | Selects "Pothole / Road Damage" from category picker; types brief description; optionally attaches camera photo | F0 — Category picker + description + media upload | "Pothole… that's the one. Should I say how deep it is? I'll just say 'large pothole on Oak St'." | Determined, slightly anxious about running long | Category picker is hard to hit on mobile if list is not large-touch-target; anonymous mode may not be obvious | Category picker uses large tap targets (min 44px); show "No account needed" label prominently under category; auto-fill address from pin drop |
| **5 · Submit & Confirm** | Taps "Submit Report" button; receives confirmation page with ticket ID | F0 — Submission + confirmation page | "Okay, it went through. Let me screenshot that number just in case." | Relieved, satisfied — brief delight | If submission silently fails (network drop), Marcus has no way to know; no retry UX | Show inline submission progress spinner; on success display ticket ID in large font with "Copy" button and shareable URL; on failure show "Save draft and retry" option |

---

#### Key Moments

- **Decision Point — Stage 2 Orient:** If the map takes more than 3 seconds to render, Marcus closes the tab and calls 311 instead. Map performance is the single highest-risk abandonment point.
- **Risk of Abandonment — Stage 3 Locate:** A mis-placed pin with no correction affordance forces Marcus to start over, exhausting his 90-second patience window.
- **Delight Opportunity — Stage 5 Confirm:** A large, scannable ticket ID with a "Copy to clipboard" button and shareable URL transforms a transactional endpoint into a moment of trust — "the city actually got this."

---

#### Success Outcome

Marcus completes pin drop → category → description → submit in under 120 seconds on a mid-range Android browser, receives a unique ticket ID on the confirmation page, and does not need to create an account at any point. *(JTBD-01.1 success measure: > 99% submission success rate, no data loss.)*

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Discover | External (search/city site) |
| Orient | F0 (Public Constituent Portal) |
| Locate | F0 — Leaflet map, address search |
| Describe | F0 — Category picker, description field, media upload |
| Submit & Confirm | F0 — Submission handler, confirmation page |

---

### JRN-01.2: Check Ticket Status Days Later Without Logging In

**Persona:** PER-01 (Marcus Webb)

**Scenario:** Three days after filing his pothole report, Marcus hasn't seen any city activity on the street. He still has the confirmation page screenshot on his phone (or the shareable URL he bookmarked). He wants to know whether the city actually read his report without having to call 311.

**Related JTBD:** JTBD-01.2

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1 · Return** | Opens shareable ticket URL from bookmark, or visits public portal and taps "Look up a ticket" | F1 — Constituent Issue Tracking / shareable URL | "Let me see if anything happened with that pothole." | Mildly curious, low urgency | If the URL is not bookmarked and the confirmation page is gone, Marcus has to remember or hunt for his ticket ID | Shareable deep-link URL should be the primary CTA on the confirmation page; SMS/email optional follow-up |
| **2 · Look Up** | Enters ticket ID in the lookup field (or deep-link resolves automatically) | F1 — Ticket lookup by ID, public page | "BRK-2847… okay, submit." | Neutral | No login should be required; if a login wall appears here, Marcus will not proceed | Ticket lookup is a fully public, no-auth page; shareable URL bypasses the lookup form entirely |
| **3 · Review Status** | Status page loads: "Open — In Progress — Paving crew scheduled next week" | F1 — Status detail page | "Okay, it's been assigned. At least they saw it." | Reassured — mild satisfaction | If status is still "Open" with no update, Marcus may feel ignored even if the ticket is legitimately queued | Show last-updated timestamp prominently; even "Received — under review" with a date communicates action |
| **4 · Share or Exit** | Screenshots status page; or copies shareable URL to send to neighbor | F1 — Shareable URL, status page | "I'll send this to David, he was asking about it too." | Satisfied — light advocacy moment | No obvious way to share the link without copying the URL manually | Prominent "Copy link" / "Share" button on status page; QR code option for in-person sharing |

---

#### Key Moments

- **Decision Point — Stage 2 Look Up:** If the system requires login to view ticket status, Marcus abandons the flow and files a duplicate report instead — creating more work for Diane.
- **Delight Opportunity — Stage 3 Review Status:** A brief, human-readable status note ("Paving crew scheduled — estimated completion this week") converts a passive check-in into active constituent trust.

---

#### Success Outcome

Marcus enters his ticket ID (or opens the shareable URL) and sees current status, substatus, and last-updated date within 3 seconds — with zero authentication required. *(JTBD-01.2 success measure.)*

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Return | F1 (Constituent Issue Tracking) — shareable URL |
| Look Up | F1 — ticket lookup form |
| Review Status | F1 — status detail page |
| Share or Exit | F1 — shareable URL / copy link |

---

## PER-02 Journeys — Diane Kowalski (City Staff — 311 Coordinator)

---

### JRN-02.1: Morning Queue Triage with Saved Bookmark

**Persona:** PER-02 (Diane Kowalski)

**Scenario:** Diane arrives at her desk at 7:45 AM. She has 20 minutes before her first call. She needs to scan the overnight queue — tickets that came in since 5 PM yesterday across her department — prioritize the urgent ones, and assign the routine ones to her junior staff. She configured a Bookmark three weeks ago and expects it to load her queue instantly.

**Related JTBD:** JTBD-02.1

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1 · Arrive & Authenticate** | Opens browser to staff portal; Auth.js session is still valid from yesterday; auto-lands on staff dashboard | F2 — Auth, staff route guard | "Please still be logged in — I do not have time to reset my password this morning." | Slightly anxious; relieved when session persists | Expired sessions force a password re-entry that breaks morning flow; no "remember me" option | Long session TTL (configurable) for recognized devices; graceful session refresh in the background |
| **2 · Load Bookmark** | Clicks "My Dept — Open (Overnight)" Bookmark from sidebar | F3 — Staff Ticket Queue, Bookmarks | "There we go. Let me see what came in." | Focused — controlled anticipation | If Bookmark is missing after a session clear, Diane must re-enter 6 filters by hand — loses 5+ minutes | Bookmarks persisted server-side (DB), not client-side; survive session expiry and browser clears; show "last loaded" timestamp |
| **3 · Scan Queue** | Reviews ticket list: 14 new items; sorts by created desc; scans category and address columns | F3 — Ticket list, column sort | "Fourteen new ones. Two of those are on Oak — probably same pothole cluster." | Methodical; mild stress if count is high | Dense information without visual hierarchy makes scanning slow; no overnight-change highlight | Highlight tickets created since user's last login with a "New" badge; cluster indicators for same-address reports |
| **4 · Prioritize** | Flags 3 tickets as high-priority; bulk-assigns the remaining routine tickets to junior staff | F3 — Bulk assign, ticket flags | "These three need my eyes. The rest can go to the team." | In control, decisive | Bulk-assign requires selecting checkboxes individually with no "select all new" shortcut | "Select all new" checkbox shortcut; sticky bulk-action toolbar that appears on multi-select |
| **5 · Drill Into Priority Ticket** | Clicks highest-priority ticket to open detail view | F4 — Staff Ticket Detail | "What exactly did they say? Any photo?" | Alert, investigative | No quick-preview before full page load; context switch breaks her queue scan rhythm | Row hover popover shows description excerpt, photo thumbnail, and contact info — full open only when needed |

---

#### Key Moments

- **Decision Point — Stage 2 Load Bookmark:** The Bookmark is the single most trust-critical feature. If it fails once (missing, wrong state), Diane reverts to her spreadsheet and the product loses her.
- **Risk of Abandonment — Stage 3 Scan Queue:** An undifferentiated list with no "new since last visit" signal forces Diane to mentally parse dates on every row, adding 5–10 minutes of cognitive load.
- **Delight Opportunity — Stage 4 Prioritize:** "Select all new" + one-tap bulk assign completes in under 30 seconds what previously took 10 minutes. This is the fastest payoff moment for Diane's daily workflow.

---

#### Success Outcome

Diane's Bookmark loads her filtered overnight queue within 5 seconds of clicking it — zero filter re-entry. She prioritizes and assigns 14 tickets in under 10 minutes. *(JTBD-02.1 success measure: Bookmark restores full filter state; ≤ 5s load time on return visits.)*

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Arrive & Authenticate | F2 (Auth & Role-Based Sessions) |
| Load Bookmark | F3 (Staff Ticket Queue) — Bookmarks |
| Scan Queue | F3 — Ticket list, sort, column config |
| Prioritize | F3 — Bulk assign, multi-select |
| Drill Into Priority | F4 (Staff Ticket Detail) |

---

### JRN-02.2: Find, Update, and Close a Ticket in Under 90 Seconds

**Persona:** PER-02 (Diane Kowalski)

**Scenario:** A constituent calls back about a pothole they reported on Oak Street ten days ago. They don't have their ticket ID. Diane needs to find the ticket by keyword or address, review its status, post a public response ("Paving crew scheduled for next week"), and move it to "In Progress." The caller is still on the line.

**Related JTBD:** JTBD-02.2

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1 · Search** | Types "Oak Street pothole" into the staff queue search bar | F3 — Full-text search (Postgres FTS) | "Three results. Middle one matches the date she mentioned." | Focused, time-pressured | If search takes > 1 second or requires exact address format, Diane loses confidence while the caller waits | FTS returns results in < 500ms p95 with highlighted match snippets; address tokenization handles partial street names |
| **2 · Identify & Open** | Scans 3 results; clicks matching ticket | F3 → F4 — Ticket detail | "BRK-2847, submitted 10 days ago — that's hers. Opening." | Alert, methodical | Multiple tickets with similar descriptions are hard to differentiate without a description excerpt in the list | Search results show: ticket ID, category, address, description excerpt (highlighted query terms), date, current status |
| **3 · Update Status** | Changes status from "Open" to "In Progress"; selects substatus "Crew Scheduled" | F4 — Status/substatus selector | "In Progress, Crew Scheduled — done. Now I need to tell her that." | Efficient, confident | Substatus list is long and unsorted — takes extra time to locate the right value | Substatuses filtered to those valid for the selected status; recently-used substatuses surface at top |
| **4 · Add Public Note** | Clicks "Insert Template"; selects "Paving Crew Scheduled" template; edits date placeholder; saves note | F4 — Templated response, public note field | "{{estimated_date}}… I'll put 'next week, week of July 13.' Done." | In control | Templated responses stored in an external Word doc require alt-tabbing and copy-paste | In-screen template picker with variable placeholder auto-focus; one-click insert into note field; caller stays on hold less |
| **5 · Save & Return to Queue** | Clicks "Save"; ticket status updates in the history timeline; Diane is returned to her queue | F4 → F3 — Save, queue auto-refresh | "Saved. Next." | Satisfied, forward momentum | Full page reload on save breaks queue scroll position | Optimistic UI update: ticket row in queue reflects new status immediately; "Next unread" navigation button on ticket detail |

---

#### Key Moments

- **Decision Point — Stage 1 Search:** If FTS returns no results for "Oak Street pothole," Diane must ask the caller for their ticket ID — creating a frustrating caller experience and breaking the 90-second target.
- **Risk of Abandonment — Stage 4 Public Note:** If template insertion requires navigating away from the ticket, Diane skips the note and sends a manual email instead — no record left in the system.
- **Delight Opportunity — Stage 5 Save:** An instant, in-page confirmation ("Status updated · note posted · constituent will see this") with a "Next case" button keeps Diane in flow instead of pulling her back to the queue manually.

---

#### Success Outcome

Diane locates the ticket via free-text search, updates status to "In Progress / Crew Scheduled," inserts a templated public response, and saves — all within 90 seconds and without leaving the ticket detail screen. *(JTBD-02.2 success measure.)*

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Search | F3 (Staff Ticket Queue) — FTS |
| Identify & Open | F3 → F4 (Staff Ticket Detail) |
| Update Status | F4 — Status/substatus selector |
| Add Public Note | F4 — Template picker, public note field |
| Save & Return | F4 → F3 — Auto-refresh queue |

---

## PER-03 Journeys — Renata Osei (City Administrator)

---

### JRN-03.1: Create a New Service Category Without a Code Deployment

**Persona:** PER-03 (Renata Osei)

**Scenario:** The Public Works director calls Renata on a Tuesday morning: the city needs to add a "Holiday Light Removal Request" seasonal category before the weekend. It needs an Open311 `service_code`, an icon, and must allow anonymous submissions. Renata needs to create it, confirm it appears in the public portal, and be done in under 5 minutes — without filing a ticket with the vendor or touching the database.

**Related JTBD:** JTBD-03.1

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1 · Navigate to Admin** | Logs into staff portal as admin; navigates to Admin Panel → Categories | F2 — Auth, admin role guard; F6 — Admin Panel | "Categories, that's the one. Should be straightforward." | Competent, purposeful | If the admin panel navigation is nested or unlabeled, Renata loses time searching; not every path is obvious on first use | Top-level "Admin" nav item with sub-menu: Categories, Departments, Users, API Keys, Templates; breadcrumb on every admin screen |
| **2 · Create New Category** | Clicks "+ New Category"; fills in: display name, description, icon, department assignment, anonymity = allowed | F6 — Category management form | "Holiday Light Removal — Public Works — anonymous allowed. What service_code should I use? I'll check the spec." | Focused; pauses to think about Open311 service_code convention | service_code field has no format hint; Renata may enter an invalid value and only discover it when an API call fails | Inline format hint: "e.g., HLREMOVAL — uppercase, no spaces"; validate uniqueness on blur; suggest next available code |
| **3 · Set Open311 Mapping** | Enters `service_code: HLREMOVAL`; confirms department routing; sets active = true | F6 — Category form, Open311 service_code field | "HLREMOVAL — that's clear enough. Active from today." | Systematic | No preview of what the public portal category picker will look like with this icon/name | Live preview pane: shows how the category card appears in the constituent portal before saving |
| **4 · Save and Verify** | Clicks "Save Category"; admin panel shows success toast; Renata opens public portal in a second tab | F6 → F0 — Admin save action; Public portal | "Let me confirm it's actually showing up for residents." | Validating, slightly tense | If the category doesn't appear immediately and there's no feedback on propagation timing, Renata will call the vendor to ask if it worked | On save: category appears in public portal within 60 seconds (no pod restart); toast shows "Live in public portal" status indicator |
| **5 · Confirm Live** | Public portal category picker shows "Holiday Light Removal" with correct icon | F0 — Public constituent portal | "There it is. Done. I'll let the director know." | Satisfied, efficient | None if propagation is immediate | Admin panel "View in public portal →" shortcut link on category row; no need to navigate manually |

---

#### Key Moments

- **Decision Point — Stage 2 Create:** An unclear `service_code` format is the most likely blocker. If Renata enters an invalid value, she may not discover it until an integrator reports an API error days later.
- **Risk of Abandonment — Stage 4 Save:** If the category does not appear in the public portal within 60 seconds, Renata will assume caching or a pod restart is required — and fall back to the legacy process of calling a developer.
- **Delight Opportunity — Stage 5 Confirm:** An "Admin → View in public portal" shortcut link proves the change is live without requiring Renata to navigate manually. This single affordance validates the entire "no code deploy" promise.

---

#### Success Outcome

Renata creates the "Holiday Light Removal" category — with service_code, icon, department, and anonymity setting — and confirms it is live in the public portal within 5 minutes, with no code deployments or pod restarts. *(JTBD-03.1 success measure.)*

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Navigate to Admin | F2 (Auth), F6 (Admin Panel) |
| Create New Category | F6 — Category management form |
| Set Open311 Mapping | F6 — service_code field, department routing |
| Save and Verify | F6 → F0 — propagation, public portal |
| Confirm Live | F0 — Public portal category picker |

---

### JRN-03.2: Issue and Revoke an API Key for an Integration Partner

**Persona:** PER-03 (Renata Osei)

**Scenario:** A civic tech vendor (Liam's company) has just signed a new contract with Bloomington and needs a write-scoped API key to start submitting service requests. Renata generates the key, shares it with Liam, and later — after a spec violation is reported — revokes the key immediately, confirming the next API call from Liam's app returns 401.

**Related JTBD:** JTBD-03.2

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1 · Navigate to API Keys** | In Admin Panel, clicks "API Keys" from the sub-menu | F6 — Admin Panel, API key management screen | "I need to generate a key for Liam's company. Should be quick." | Purposeful, methodical | API key management buried in a generic "Settings" section is easy to miss | Dedicated "API Keys" item in admin sub-menu with count badge of active keys |
| **2 · Generate New Key** | Clicks "+ New API Key"; enters label "CivicTech Integrator — Liam Tran"; sets scope = write; clicks "Generate" | F6 — API key generation form | "Label it clearly so I know who this belongs to in six months. Write scope — they need to POST requests." | Careful, deliberate | Key is shown only once at creation — Renata must copy it immediately or it cannot be retrieved; this creates urgency | On generation: large-font key display with "Copy" button; countdown "Copy now — this key will not be shown again"; email-to-partner mailto shortcut |
| **3 · Share Key with Partner** | Copies key; sends to Liam via secure channel (email, shared vault); confirms receipt | External — secure communication | "Done. I'll email the key via our secure portal and follow up." | Responsible, slightly cautious | No built-in delivery mechanism — Renata must use an external channel | Optional: "Send key link to email" encrypted delivery — scoped, expiring link rather than raw key in email body |
| **4 · Monitor and Audit** | Three weeks later: checks API Keys list; sees Liam's key last-used timestamp | F6 — API key list with last-used column | "Last used 2 hours ago — they're active. Good." | Confident | Last-used timestamp buried in a detail view instead of visible in the list; requires extra clicks per key | Last-used timestamp visible inline in the API key list row; sortable column to surface dormant keys |
| **5 · Revoke Key** | A spec violation is reported; Renata clicks "Revoke" on Liam's key; confirms dialog | F6 — Revoke action, confirmation dialog | "Revoked. Their next call should 401 immediately. Let me verify." | Decisive, responsible | If revocation is not immediate (requires pod restart), Renata cannot trust the security boundary | Revocation takes effect immediately — no cache TTL, no pod restart; success toast: "Key revoked — all subsequent requests will return 401" |

---

#### Key Moments

- **Decision Point — Stage 2 Generate:** The one-time key display is the highest-risk UX moment. If Renata navigates away before copying, the key is lost and she must revoke and re-issue — creating downtime for Liam's integration.
- **Risk of Abandonment — Stage 5 Revoke:** If revocation is not instant (e.g., requires a pod restart), Renata loses confidence in the security boundary and escalates to a developer — defeating the entire admin-self-service promise.
- **Delight Opportunity — Stage 4 Monitor:** A sortable "last-used" column on the API key list lets Renata audit all integrations in 30 seconds without opening each key's detail view. This turns a security audit from a chore into a glance.

---

#### Success Outcome

Renata generates a labeled, write-scoped API key, shares it with Liam, monitors its last-used timestamp from the admin list, and revokes it — all within the admin UI, zero database commands, zero pod restarts. Revocation takes effect immediately on Liam's next API call (HTTP 401). *(JTBD-03.2 success measure.)*

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Navigate to API Keys | F6 (Admin Panel) — API Keys screen |
| Generate New Key | F6 — Key generation form |
| Share Key | External (secure channel) |
| Monitor and Audit | F6 — API key list, last-used timestamp |
| Revoke Key | F6 → F7 — Revoke action; 401 enforcement |

---

## PER-04 Journeys — Liam Tran (Third-Party Integrator)

---

### JRN-04.1: POST a New Service Request via the Open311 API

**Persona:** PER-04 (Liam Tran)

**Scenario:** A constituent using Liam's civic tech mobile app taps "Report Issue" in Bloomington. The app collects the pin location, service category, and description, then makes a `POST /api/v2/requests` call to Bloomington's uReport NG endpoint using the write-scoped API key Renata provided. Liam's existing integration code — unchanged since the legacy system — must work without modification.

**Related JTBD:** JTBD-04.1

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1 · Receive New API Key** | Liam receives write-scoped key from Renata; updates his secrets vault; runs integration test suite against the new endpoint | F6 (key from Renata) → F7 — `POST /api/v2/requests` | "Let me run the contract tests first. If the field names are right, everything else should just work." | Methodical, cautiously optimistic | No staging endpoint or sandbox: Liam must test against the live system or request a test environment explicitly | Provide a documented sandbox mode or a test API key with no side-effects; return `dry_run: true` field in test responses |
| **2 · Submit POST Request** | Integration code sends `POST /api/v2/requests?api_key=...` with `service_code`, `lat`, `long`, `description` | F7 — `POST /api/v2/requests` | "service_code=POTHOLE, lat=39.165, long=-86.526 — standard GeoReport v2 body. Should get back a service_request_id." | Confident in his code; dependent on server correctness | Any field-name deviation (e.g., `serviceRequestId` instead of `service_request_id`) breaks his client parser without a clear error | Response uses exact GeoReport v2 field names (`service_request_id`) in both JSON and XML; contract tests in CI enforce exact names |
| **3 · Parse Response** | Client code extracts `service_request_id` from JSON response; stores for later polling | F7 — JSON/XML response body | "Got it: `service_request_id: BRK-4901`. My app stores that for status polling. Perfect." | Satisfied if field names match exactly | Inconsistent field casing in legacy responses required defensive normalization; new system must eliminate this | Strict type-safe response serialization via Prisma → JSON; OpenAPI schema published so Liam can validate automatically |
| **4 · Handle Auth Error Path** | On a separate test run, Liam submits with a revoked key; verifies the response is HTTP 401 with a machine-readable body | F7 — Auth error handling | "401 with `error: invalid_api_key` — good. My retry logic won't treat this as a server error." | Analytically satisfied | Legacy API returned ambiguous 500 on auth failure; caused false server-outage alerts in Liam's monitoring | `401` response includes `{"error": "invalid_api_key", "message": "..."}` in JSON (or XML for `format=xml`); documented in OpenAPI spec |

---

#### Key Moments

- **Decision Point — Stage 1 Receive Key:** If there is no staging environment, Liam's only option is to run contract tests against production — risking real ticket creation during testing. A documented test-mode or sandbox endpoint de-risks cutover.
- **Risk of Abandonment — Stage 2 Submit POST:** A single field-name mismatch (e.g., `id` vs. `service_request_id`) breaks Liam's entire integration silently — submitted reports appear to succeed on his side but fail to create tickets. Contract tests in CI are the primary mitigation.
- **Delight Opportunity — Stage 4 Handle Auth Error:** A clean, predictable 401 response body — distinct from 5xx — means Liam's monitoring shows zero false server-outage alerts after key revocation. This is the definition of a trustworthy API.

---

#### Success Outcome

Liam's existing integration code, without modification, submits a service request via `POST /api/v2/requests` and receives a valid `service_request_id` in GeoReport v2 format. Auth errors return 401 with a machine-readable body. 100% of contract test assertions pass. *(JTBD-04.1 success measure.)*

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Receive New API Key | F6 (Admin Panel — API key from Renata) |
| Submit POST Request | F7 — `POST /api/v2/requests` |
| Parse Response | F7 — JSON/XML response, GeoReport v2 field names |
| Handle Auth Error | F7 — 401 response, error body; F6 — revocation |

---

### JRN-04.2: Poll and Paginate Service Requests for Nightly Sync

**Persona:** PER-04 (Liam Tran)

**Scenario:** Every night at 2 AM, Liam's scheduled sync job runs against Bloomington's endpoint: it queries all open requests updated since the last sync run, iterates through paginated results, and updates his local cache. The job must complete without timeouts, must not miss records, and must handle a 429 rate-limit response gracefully if it hits the throttle threshold.

**Related JTBD:** JTBD-04.2, JTBD-04.3

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1 · Initiate Sync Job** | Cron fires at 02:00 UTC; job assembles query: `GET /api/v2/requests?status=open&start_date=2026-07-05&page=1&page_size=50` | F7 — `GET /api/v2/requests` | "Standard params — same as last night's run. Should be a few hundred records max." | Confident in routine | Legacy endpoint had no pagination — large date ranges caused timeouts; Liam had to workaround by shrinking windows | `page` and `page_size` documented with defaults; `total_count` or `has_next_page` field in response envelope |
| **2 · Receive First Page** | Server returns 50 records in < 2 seconds; response includes `has_next_page: true, total_count: 187` | F7 — Paginated response envelope | "187 records. 4 pages at 50 each. Let me iterate." | Methodical, trusting the API contract | No `total_count` in legacy response — sync job never knew if it had all records; silent data gaps | Response envelope includes `page`, `page_size`, `total_count`, `has_next_page` as top-level fields — not buried in headers |
| **3 · Paginate Through Results** | Job iterates pages 2, 3, 4; each returns < 2 seconds; final page returns `has_next_page: false` | F7 — Paginated `GET /api/v2/requests` | "Page 4, 37 records, `has_next_page: false`. We're done. 187 total — matches." | Satisfied — clean termination | Inconsistent pagination across pages (e.g., page 3 returns 51 records) would break Liam's count validation | Strict `page_size` enforcement: last page returns ≤ `page_size` records and `has_next_page: false`; no off-by-one |
| **4 · Hit Rate Limit** | On a large historical backfill run, job fires 200 requests in 30 seconds; server returns HTTP 429 with `Retry-After: 60` | F7 — Rate-limit response, `Retry-After` header | "429 — rate limit. `Retry-After: 60`. Back off for 60 seconds and resume. Not a server outage." | Relieved the signal is actionable | Legacy API returned 500 on throttling — Liam's monitoring logged false server errors; support emails followed | 429 response includes both `Retry-After` header and machine-readable body; distinct from all 5xx codes |
| **5 · Complete Sync & Verify** | Job resumes after backoff; completes remaining pages; writes sync log: "187 records synced, 0 errors, 02:04 UTC" | F7 → Internal (Liam's system) | "Clean run. 187 records, no errors. Schedule confirmed." | Confident, satisfied | If sync completes but total_count mismatches Liam's local count, he has no way to identify missing records | Support a `GET /api/v2/requests/count?status=open&start_date=...` or include `total_count` so Liam can cross-validate |

---

#### Key Moments

- **Decision Point — Stage 2 Receive First Page:** If the response envelope omits `total_count` or `has_next_page`, Liam's sync job cannot determine when it has retrieved all records — leading to silent data gaps in his local cache.
- **Risk of Abandonment — Stage 4 Hit Rate Limit:** A 429 response that is indistinguishable from a 500 causes Liam's monitoring to alert at 2 AM, waking up his on-call engineer unnecessarily — and generating a support escalation to Bloomington IT.
- **Delight Opportunity — Stage 5 Complete Sync:** A predictable, documented pagination contract (page/page_size/has_next_page/total_count) is not flashy, but it earns deep integration partner trust. Liam's nightly job "just works" — no defensive hacks, no workarounds.

---

#### Success Outcome

Liam's nightly sync job queries all updated open requests via paginated `GET /api/v2/requests`, completes with no timeouts and no missing records. Rate-limit responses return HTTP 429 with `Retry-After`. Auth failures return HTTP 401. All signals are unambiguous and actionable by the existing retry logic. *(JTBD-04.2 + JTBD-04.3 success measures.)*

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Initiate Sync Job | F7 — `GET /api/v2/requests` with filters |
| Receive First Page | F7 — Paginated response envelope |
| Paginate Through Results | F7 — Pagination parameters |
| Hit Rate Limit | F7 — 429 + `Retry-After` |
| Complete Sync & Verify | F7 — Full pagination contract |

---

## Cross-Journey Patterns

### CP-01: Immediate Propagation as Trust Signal
**Appears in:** JRN-03.1 (Stage 4), JRN-03.2 (Stage 5), JRN-04.1 (Stage 4)

Every persona whose action has a downstream effect — Renata saving a category, Renata revoking a key, Liam's API key being revoked — depends on the system reflecting that change immediately. Delayed propagation (caching, pod restart required) breaks the trust model for all three personas. Reference data (categories, API keys, substatuses) must be read from the database on every request, not from a process-level cache, to satisfy this pattern.

### CP-02: Zero Re-Entry After Configuration
**Appears in:** JRN-02.1 (Stage 2), JRN-01.2 (Stage 1)

Both Diane (Bookmark) and Marcus (shareable ticket URL) depend on the system remembering state across sessions without requiring re-entry. Bookmarks persisted server-side per user account and shareable deep-link URLs are the two implementations of this pattern. Both must survive session expiry and browser clears.

### CP-03: Actionable Error Signals
**Appears in:** JRN-04.1 (Stage 4), JRN-04.2 (Stage 4)

Liam's integration code relies on unambiguous HTTP status codes: 401 for auth failure, 429 with `Retry-After` for rate limiting, 5xx for genuine server errors. This pattern is also relevant for Renata (Stage 5 of JRN-03.2): her "Revoke" action must produce a verifiable 401 from Liam's next call to confirm the revocation worked. The API's error contract is a product feature, not just an engineering detail.

### CP-04: Mobile-First Performance Budget
**Appears in:** JRN-01.1 (Stage 2), JRN-01.2 (Stage 3)

Marcus's entire journey hinges on the public portal loading in under 3 seconds on a 4G connection. This is not just an NFR — it is the primary deciding factor between "files a report" and "closes the tab." Map tile loading, LCP optimization, and media lazy-loading are journey-critical, not nice-to-have.

### CP-05: Audit Trail as First-Class Feature
**Appears in:** JRN-02.2 (Stage 5), JRN-03.1 (Stage 4), JRN-03.2 (Stage 4–5)

Diane's ticket history timeline, Renata's admin action log, and Liam's key last-used timestamp all depend on an append-only, timestamped audit trail. The pattern appears across three personas with different motivations (workflow efficiency, security auditing, legal accountability). The `TicketHistory` and admin log tables must be write-once; no actor can edit or delete audit records.

---

## Journey-to-JTBD Traceability

| JRN-ID | Stage | JTBD-ID | Expected Outcome |
|---|---|---|---|
| JRN-01.1 | 1 Discover | JTBD-01.1 | Portal discoverable and loads within 3s on 4G |
| JRN-01.1 | 2 Orient | JTBD-01.1 | Map loads within 3s; map-first layout visible immediately |
| JRN-01.1 | 3 Locate | JTBD-01.1 | Pin drop or address search completes; location confirmed |
| JRN-01.1 | 4 Describe | JTBD-01.1 | Category selected; description entered; anonymous mode confirmed |
| JRN-01.1 | 5 Submit | JTBD-01.1 | Ticket ID returned on confirmation page; > 99% success rate |
| JRN-01.2 | 1 Return | JTBD-01.2 | Shareable URL accessible; no login required |
| JRN-01.2 | 2 Look Up | JTBD-01.2 | Ticket ID lookup available at public URL with no auth |
| JRN-01.2 | 3 Review Status | JTBD-01.2 | Status, substatus, last-updated date displayed in < 3s |
| JRN-01.2 | 4 Share | JTBD-01.2 | Shareable URL enables return without re-entering ID |
| JRN-02.1 | 1 Arrive | JTBD-02.1 | Staff session persists across days; no forced re-login on morning open |
| JRN-02.1 | 2 Load Bookmark | JTBD-02.1 | Bookmark restores full filter state within 5s; zero re-entry |
| JRN-02.1 | 3 Scan Queue | JTBD-02.1 | New-since-last-visit tickets visually distinguished |
| JRN-02.1 | 4 Prioritize | JTBD-02.1 | Bulk assign completes in one action on selected tickets |
| JRN-02.1 | 5 Drill In | JTBD-02.2 | Ticket detail opens from queue click; no context switch |
| JRN-02.2 | 1 Search | JTBD-02.2 | FTS returns results < 500ms p95 |
| JRN-02.2 | 2 Identify & Open | JTBD-02.2 | Search result includes description excerpt + match highlight |
| JRN-02.2 | 3 Update Status | JTBD-02.2 | Status/substatus selector on ticket detail; no navigation away |
| JRN-02.2 | 4 Add Public Note | JTBD-02.2 | Template picker inline; variable placeholder auto-focus |
| JRN-02.2 | 5 Save & Return | JTBD-02.2 | Ticket closed in < 90s total; queue reflects update immediately |
| JRN-03.1 | 1 Navigate | JTBD-03.1 | Admin panel accessible to admin role; clear sub-menu |
| JRN-03.1 | 2 Create Category | JTBD-03.1 | Category form with all required fields including service_code |
| JRN-03.1 | 3 Set Open311 Mapping | JTBD-03.1 | service_code validated; department routing set |
| JRN-03.1 | 4 Save and Verify | JTBD-03.1 | Category appears in public portal within 60s; no pod restart |
| JRN-03.1 | 5 Confirm Live | JTBD-03.1 | End-to-end category creation < 5 min; zero code deployment |
| JRN-03.2 | 1 Navigate to Keys | JTBD-03.2 | API key management accessible in admin panel |
| JRN-03.2 | 2 Generate Key | JTBD-03.2 | Scoped key generated; displayed once with copy affordance |
| JRN-03.2 | 3 Share Key | JTBD-03.2 | Key shareable via secure channel; no DB commands required |
| JRN-03.2 | 4 Monitor | JTBD-03.2 | Last-used timestamp visible in API key list row |
| JRN-03.2 | 5 Revoke | JTBD-03.2 | Revocation immediate; next API call returns 401; no pod restart |
| JRN-04.1 | 1 Receive Key | JTBD-04.1 | Scoped API key received from Renata; integration test suite available |
| JRN-04.1 | 2 Submit POST | JTBD-04.1 | `POST /api/v2/requests` accepts GeoReport v2 fields exactly |
| JRN-04.1 | 3 Parse Response | JTBD-04.1 | `service_request_id` returned in exact v2 field name; JSON + XML |
| JRN-04.1 | 4 Auth Error Path | JTBD-04.1, JTBD-04.3 | HTTP 401 with machine-readable body on revoked/invalid key |
| JRN-04.2 | 1 Initiate Sync | JTBD-04.2 | `GET /api/v2/requests` accepts `page`, `page_size`, `status`, `start_date` |
| JRN-04.2 | 2 First Page | JTBD-04.2 | Response envelope includes `total_count`, `has_next_page` |
| JRN-04.2 | 3 Paginate | JTBD-04.2 | All pages return < 2s; `has_next_page: false` on last page |
| JRN-04.2 | 4 Rate Limit | JTBD-04.3 | HTTP 429 returned with `Retry-After` header; distinct from 5xx |
| JRN-04.2 | 5 Complete Sync | JTBD-04.2 | Full dataset synced; no missing records; total_count cross-validates |

---

*Document owner: uReport NG Project Team*
*Derived from: PERSONAS-uReportNG.md, JTBD-uReportNG.md, PRD-uReportNG.md, .planning/PROJECT.md*
*Downstream consumers: FRD-uReportNG.md, STORY-MAP-uReportNG.md, UserStories-uReportNG.md, UX/design briefs*
