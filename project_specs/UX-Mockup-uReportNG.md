# UX Mockup — uReport NG
## City of Bloomington Municipal 311/CRM

**Project:** uReport NG  
**Generated:** 2026-07-06  
**Based on:** UserStories-uReportNG.md, PRD-uReportNG.md, FRD-uReportNG.md, JOURNEYS-uReportNG.md  

---

## Overview

uReport NG is a map-first municipal 311 platform serving three distinct audiences on three distinct surfaces:

1. **Public Portal** (`/`) — Mobile-first, anonymous-friendly reporting flow. Hero experience. Map dominates.
2. **Staff Console** (`/staff/**`) — Ticket queue with filters, saved views, detail workspace. Desktop-primary with mobile support.
3. **Admin Panel** (`/admin/**`) — Configuration screens for reference data and system management.

---

## Design Principles

### 1. Map First
The Leaflet/OpenStreetMap map is the entry point — not a sidebar or afterthought. On the public portal the map is the hero; on the staff queue it is a toggle mode; on ticket detail it is a mini-map in the header.

### 2. Card-Based Layout, Sidebar Navigation
Content lives in rounded shadcn/ui Cards with subtle shadows. Navigation lives in a persistent left sidebar (collapsed to icon-only on mobile). Sticky filter bar on all list pages.

### 3. Progressive Disclosure
Public portal: collect location first, then category, then description, then contact. Never show a long form up front. Staff console: queue row shows minimal info; popover on hover shows more; click opens full detail.

### 4. Generous Spacing, AA Contrast
All interactive targets ≥ 44px tall. Body text contrast ≥ 4.5:1. Tailwind `space-y-6` / `gap-6` as base rhythm. Rounded cards (`rounded-xl`), subtle shadows (`shadow-sm`).

### 5. Light / Dark with System Default
shadcn/ui theming via CSS variables. `@media (prefers-color-scheme: dark)` as default. Municipal-neutral palette: slate primary, configurable brand accent (`--color-primary`).

### 6. Fully Responsive
Three breakpoints:
- **Mobile** `< 768px` — single column, bottom sheet modals, large tap targets
- **Tablet** `768px–1024px` — two-column where applicable, collapsible sidebar
- **Desktop** `> 1024px` — three-panel layouts, persistent sidebar, hover affordances

### 7. Accessible Throughout
- Keyboard navigation: `Tab`, `Enter`, `Escape`, `Arrow` keys on all interactive controls
- ARIA: `role="main"`, `aria-label` on map container, `aria-live` on status changes, `aria-describedby` on form fields
- Focus rings visible in both light and dark mode
- Skip-to-content link (`#main-content`) on every page
- Leaflet maps: keyboard zoom controls, screen-reader descriptions via `aria-label`

---

## Design Token Summary

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | Slate-600 (default, city-configurable) | Buttons, links, badges |
| `--color-destructive` | Red-600 | Error states, destructive actions |
| `--color-success` | Green-600 | Success toasts, confirmed states |
| `--color-warning` | Amber-500 | Warnings, out-of-bounds alerts |
| `--radius` | `0.75rem` | Card border radius |
| Font | Inter / system-ui | All text |
| Base spacing | `1.5rem` (24px) | Section padding |
| Touch target | `44px` min height | All interactive elements |

---

## Layout Shell

All pages share a common shell:

```
┌──────────────────────────────────────────────────────────┐
│ Skip to content link (visually hidden, focus-visible)    │
├──────┬───────────────────────────────────────────────────┤
│      │  Top header bar (mobile only)                     │
│ Side │   Logo + hamburger menu                           │
│ bar  ├───────────────────────────────────────────────────┤
│      │                                                   │
│ Nav  │   PAGE CONTENT (role="main" id="main-content")   │
│      │                                                   │
│ (per │                                                   │
│ sur- │                                                   │
│ face)│                                                   │
│      │                                                   │
└──────┴───────────────────────────────────────────────────┘
```

**Public portal sidebar:** minimal — logo, "Report an Issue" CTA, "My Ticket" lookup link, map link.  
**Staff console sidebar:** logo, Tickets, People, Reports, Account; Saved Views section below.  
**Admin panel sidebar:** logo + Admin badge, Categories, Departments, Substatuses, Templates, Users, API Keys.

---

## Screen Index

| Screen ID | Name | Route | Persona | Priority |
|-----------|------|-------|---------|----------|
| SCR-01 | Public Portal Home (Map + Report) | `/` | Marcus | P0 |
| SCR-02 | Report Submission Form | `/` (slide-up panel) | Marcus | P0 |
| SCR-03 | Submission Confirmation | `/tickets/[id]/confirm` | Marcus | P0 |
| SCR-04 | Public Ticket Status | `/tickets/[id]` | Marcus | P0 |
| SCR-05 | Public Issue Map | `/map` | Marcus | P0 |
| SCR-06 | Login | `/login` | Diane/Renata | P0 |
| SCR-07 | Staff Ticket Queue | `/staff/tickets` | Diane | P0 |
| SCR-08 | Staff Ticket Detail | `/staff/tickets/[id]` | Diane | P0 |
| SCR-09 | Staff People Search | `/staff/people` | Diane | P1 |
| SCR-10 | Staff Person Detail | `/staff/people/[id]` | Diane | P1 |
| SCR-11 | Staff Reports Dashboard | `/staff/reports` | Diane/Renata | P1 |
| SCR-12 | Admin Categories | `/admin/categories` | Renata | P0 |
| SCR-13 | Admin Departments | `/admin/departments` | Renata | P0 |
| SCR-14 | Admin Substatuses | `/admin/substatuses` | Renata | P0 |
| SCR-15 | Admin Response Templates | `/admin/response-templates` | Renata | P0 |
| SCR-16 | Admin Users | `/admin/users` | Renata | P0 |
| SCR-17 | Admin API Keys | `/admin/api-keys` | Renata | P0 |
| SCR-18 | Change Password | `/staff/account/password` | Diane | P0 |
# Flow-00: Public Issue Reporting
## JRN-01.1 — Marcus Webb reports a pothole anonymously on mobile

**Trigger:** Constituent navigates to `/` (city website link, search result, or direct URL)  
**User Stories:** US-0.1, US-0.2, US-0.3, US-0.4, US-0.5, US-0.6  
**Persona:** Marcus Webb (PER-01)  
**Device:** Mobile-first (Android Chrome, iOS Safari 16+)  

---

## Flow Diagram

```
[User opens / on mobile]
         │
         ▼
[Map loads — centered on city, zoom 13]
  "Tap map to place pin" tooltip shown
         │
         ├── Map renders < 3s ──▶ [Pin placement mode]
         │
         └── Map fails / > 3s ──▶ [Skeleton + "Loading map..." fallback]
                                          │
                                          ▼
                                   [Show address-only entry mode]

[Pin placement mode]
         │
         ├── User taps/clicks map ──▶ [Draggable pin placed]
         │                                    │
         │                                    ▼
         │                         [Reverse geocode → address populated]
         │                                    │
         │                         [Pin inside bbox?]
         │                                    │
         │                         ├── Yes → no warning
         │                         └── No  → amber warning banner
         │                                    (submission not blocked)
         │
         └── User types address ──▶ [Debounced 300ms → Nominatim]
                  │                         │
                  ▼                         ▼
           [Address dropdown          [Up to 5 candidates shown]
            ≥3 chars trigger]                │
                                     [User selects candidate]
                                             │
                                             ▼
                                    [Pin placed at lat/lng]
                                    [Address field populated]

[Location confirmed → Slide-up report panel opens]
         │
         ▼
[Step 1: Category selection]
  • Dropdown of active categories (GET /api/categories)
  • Department name shown below selector
  • anon_allowed status determines contact field visibility
         │
         ▼
[Step 2: Description]
  • Free text, 10–4000 chars
  • Live character count
  • Inline validation on blur
         │
         ▼
[Step 3: Photo upload (optional)]
  • Drag-and-drop or tap to browse
  • Up to 5 files, ≤10MB each
  • image/* or application/pdf
  • File thumbnails shown after selection
         │
         ▼
[Step 4: Contact info]
  ├── anon_allowed=true:
  │     "Leave blank to submit anonymously" label
  │     name/email/phone all optional
  │
  └── anon_allowed=false:
        name required, email required
        "Contact required for this category" notice
         │
         ▼
[Submit button]
  • Client validates all required fields
  • If validation errors → inline errors shown, no submit
         │
         ├── POST /api/tickets → 201 ──▶ [Navigate to /tickets/[id]/confirm]
         │
         ├── POST /api/tickets → 422 ──▶ [Inline field errors displayed]
         │                               [Form stays open, user corrects]
         │
         └── POST /api/tickets → 500 ──▶ [Error card: "Submission failed"]
                                          ["Try again" button + "Save draft" option]
                                          [Spinner stops]
```

---

## Step Details

### Step 0: Map Load
- **Entry point:** `/`
- **Behavior:** Leaflet dynamically imported (`{ ssr: false }`). Map skeleton shown immediately. Tiles load progressively.
- **Tooltip:** First-time hint "Tap the map to mark the issue location" (dismissible, stored in sessionStorage)
- **Fallback:** If map fails, address-only mode shown with geocoder still available

### Step 1: Pin Placement
- **Tap/click:** Places draggable marker pin (primary color, drop animation)
- **Drag:** Pin can be repositioned; address updates on drag end
- **Confirm strip:** Small bottom strip shows "📍 [Address]  ✓ Looks right?" with [Change] and [Confirm] buttons (44px min height)
- **Keyboard:** Arrow keys move map viewport; Enter places pin at center

### Step 2: Report Panel (Slide-up Sheet)
- **Mobile:** Sheet slides up from bottom (≥60% viewport height)
- **Desktop:** Side panel slides in from right (400px wide)
- **Header:** "Report an Issue" + progress steps indicator (1–4)
- **Close:** × button, swipe-down on mobile; confirmation dialog if data entered

### Step 3: Category
- **UI:** shadcn/ui `<Select>` with category icon + name
- **Department hint:** `<p class="text-sm text-muted-foreground">Routed to: [Dept Name]</p>` below selector
- **Anonymous notice:** Conditional banner below department hint

### Step 4: Description
- **UI:** `<Textarea>` with min 3 rows, max 8 rows
- **Counter:** `[chars]/4000` shown bottom-right, turns red at >3800
- **Validation:** Error shown on blur if < 10 chars

### Step 5: Photo Upload
- **UI:** Drop zone card with camera icon, "Tap to add photos"
- **After upload:** Thumbnail grid (2×N) with × remove button per file
- **Errors:** MIME invalid / too large shown inline per file

### Step 6: Contact
- **Conditional:** Only shown after category selection
- **Layout:** name, email, phone in single-column stack
- **Labels:** Each field has visible label + `aria-required` where applicable

### Step 7: Submit
- **Button state:** Disabled until required fields valid; enabled state is primary color
- **Loading:** Spinner inside button; button text → "Submitting…"; form fields disabled
- **Success:** Navigate to confirmation page
- **Network error:** Toast + "Try again" button; form re-enabled

---

## Exit Points

| Exit | Condition | Destination |
|------|-----------|-------------|
| Success | HTTP 201 from POST /api/tickets | `/tickets/[id]/confirm` |
| User closes panel | Tap ×, swipe down | Back to map (no data loss if fields filled — warn) |
| Navigates away | Browser back | Confirm dialog if form dirty |
# Flow-01: Constituent Ticket Tracking
## JRN-01.2 — Marcus checks ticket status without logging in

**Trigger:** Constituent opens a bookmarked URL `/tickets/[id]` or enters a ticket ID  
**User Stories:** US-1.1, US-1.2, US-1.3  
**Persona:** Marcus Webb (PER-01)  
**Device:** Mobile or desktop, no authentication required  

---

## Flow Diagram

```
[User opens /tickets/[id] or /map]
         │
         ├── Deep link URL ──▶ [Server fetches ticket by ID]
         │                              │
         │                     ├── Found ──▶ [Render public status page]
         │                     │
         │                     └── Not found ──▶ [404 "Ticket not found" page]
         │                                         [Link back to / to report new issue]
         │
         └── /map ──▶ [Public issue map loads]
                               │
                               ▼
                      [GET /api/tickets/public-map → GeoJSON]
                               │
                               ▼
                      [Leaflet map with clustered markers]
                               │
                               ├── Click cluster ──▶ [Zoom in + expand markers]
                               │
                               └── Click marker ──▶ [Popup: category, status, address]
                                                            │
                                                   [View details →] link
                                                            │
                                                            ▼
                                                  [/tickets/[id] public page]

[Public status page — /tickets/[id]]
         │
         ▼
[Ticket info displayed]
  • Ticket reference ID (large, prominent)
  • Category + status badge
  • Last updated timestamp
  • Address + mini-map
  • Public staff responses (is_public=true only)
  • "Copy link" button
         │
         ├── User copies link ──▶ [Clipboard toast "Link copied!"]
         │
         └── User exits ──▶ [Back to map / browser back]
```

---

## Key UX Notes

- **No login gate** — The entire `/tickets/[id]` and `/map` surface is public. Any authentication wall = Marcus files a duplicate report.
- **Status staleness** — Last-updated timestamp shown prominently even if status = "Open". "Received on [date]" communicates action.
- **Share affordance** — "Copy link" button (Clipboard API) with fallback `<input readonly>` for older browsers.
- **Shareable URL persistence** — URL `/tickets/[id]` is stable and never changes regardless of status updates.
- **Map data refresh** — If user returns to the `/map` tab after 5+ minutes of inactivity, data is refetched silently (no loading flash if cached data is still shown while refresh occurs).
# Flow-02: Staff Morning Queue Triage
## JRN-02.1 — Diane loads saved Bookmark and bulk-assigns overnight tickets

**Trigger:** Staff logs in (or session persists) and navigates to `/staff/tickets`  
**User Stories:** US-2.1, US-3.1, US-3.2, US-3.3, US-3.4, US-3.5  
**Persona:** Diane Kowalski (PER-02)  
**Device:** Desktop primary  

---

## Flow Diagram

```
[Staff navigates to /staff/tickets]
         │
         ├── Session valid ──▶ [Queue loads with last active filter state]
         │
         └── Session expired ──▶ [Redirect to /login?callbackUrl=/staff/tickets]
                                          │
                                          ▼
                                 [Login page]
                                          │
                                 [Submit credentials]
                                          │
                                 ├── Valid ──▶ [Redirect back to /staff/tickets]
                                 └── Invalid ──▶ [Error: "Invalid username or password"]

[Staff Ticket Queue loaded]
         │
         ▼
[Sidebar: "Saved Views" section visible]
  Diane clicks "My Dept — Open (Overnight)" bookmark
         │
         ▼
[GET /api/staff/bookmarks/[id] → filter_json hydrated]
[GET /api/staff/tickets?<filter params>]
         │
         ▼
[Paginated ticket list renders]
  • "New" badge on tickets created since last login
  • Sort: created_at DESC (default)
  • Columns: ID, category, dept, status, assignee, created, updated
         │
         ├── Row hover ──▶ [Quick-view popover: description excerpt, photo thumb, address]
         │
         ├── Click row ──▶ [Navigate to /staff/tickets/[id] detail page]
         │
         ├── Search field ──▶ [FTS query, results < 500ms p95]
         │
         ├── Filter panel ──▶ [Category, dept, status, date range, bbox, assignee]
         │
         └── Map view toggle ──▶ [Leaflet map with filtered tickets as markers]

[Multi-select mode]
  User checks row checkboxes (or "Select all new" shortcut)
         │
         ▼
[Bulk action bar appears (sticky, bottom of viewport)]
  "X tickets selected"  [Update Status ▾]  [Assign To ▾]  [Clear]
         │
         ├── Update Status ──▶ [Status picker dropdown]
         │                              │
         │                     [Confirm → PATCH /api/staff/tickets/bulk]
         │                              │
         │                     [Toast: "X tickets updated"]
         │                     [Queue refreshes]
         │
         └── Assign To ──▶ [Staff typeahead search]
                                    │
                           [Select user → PATCH bulk]
                                    │
                           [Toast: "Assigned to [Name]"]

[Save current filter as bookmark]
  User clicks "Save View" button in filter bar
         │
         ▼
[Dialog: "Name this view" text input]
  [Save]  [Cancel]
         │
         ├── Name unique ──▶ [POST /api/staff/bookmarks]
         │                   [Bookmark appears in sidebar]
         │                   [Toast: "View saved"]
         │
         └── Name conflict ──▶ [Inline error: "A view with this name already exists"]
```

---

## Key UX Notes

- **Bookmark trust:** Bookmarks stored server-side (DB). Survive session expiry and browser clears. Show "Last loaded: [timestamp]" in bookmark tooltip.
- **"New" badge:** Tickets created after `User.last_login_at` get a green "New" dot in the ID column.
- **Select all new:** Header checkbox area includes a secondary "Select new" link that checks only new-since-last-login tickets.
- **Sticky bulk bar:** The bulk action bar is `position: sticky; bottom: 0` and floats above the table on mobile. Appears only when ≥1 checkbox is checked.
- **Map view:** Preserves all active filters. Switching back to list view restores scroll position.
- **Filter URL sync:** All filter state is encoded in URL query params so filters survive refresh and can be shared.
# Flow-03: Staff Ticket Find, Update & Close
## JRN-02.2 — Diane finds, updates status, and adds a templated response in < 90s

**Trigger:** Constituent calls in; Diane needs to find ticket by address keyword  
**User Stories:** US-3.2, US-4.1, US-4.2, US-4.3, US-4.4, US-4.5, US-4.6  
**Persona:** Diane Kowalski (PER-02)  
**Device:** Desktop  

---

## Flow Diagram

```
[Diane types "Oak Street pothole" in search bar on /staff/tickets]
         │
         ▼
[GET /api/staff/tickets?q=Oak+Street+pothole]
[FTS returns results < 500ms p95]
         │
         ▼
[Search results list: description excerpt with match highlights]
  • ticket ID, category, address, status, date shown per row
  • Matching terms highlighted in yellow
         │
         ├── No results ──▶ [Empty state: "No tickets match your search"]
         │                  [Suggest: broaden search or check filters]
         │
         └── Results found ──▶ [Click matching row]
                                       │
                                       ▼
                              [Navigate to /staff/tickets/[id]]

[Staff Ticket Detail page loads]
         │
         ▼
[All ticket data in single server fetch]
  Header: ID, category, dept, status badge, address, mini-map
  History timeline (chronological)
  Status/substatus selectors
  Assignee picker
  Response composer
  Media gallery
  Linked constituent panel
  Related tickets panel

[Status update]
  Diane selects new status from dropdown
         │
         ▼
[Confirmation dialog opens]
  "Change status from [Open] → [In Progress]?"
  Optional note textarea
  [Confirm]  [Cancel]
         │
         ├── Confirm ──▶ [PATCH /api/staff/tickets/[id]]
         │               [TicketHistory entry created]
         │               [Status badge updates in-page (optimistic)]
         │               [Timeline entry animates in]
         │
         └── Cancel ──▶ [Dialog closes, no change]

[Substatus selection]
  Substatus dropdown filters to only valid substatuses for current status
         │
         ▼
  [PATCH /api/staff/tickets/[id] with substatus_id]

[Add public response]
  Diane clicks "Insert Template" dropdown
         │
         ▼
  [Template picker: name, preview snippet, category/dept filter]
  Diane selects template
         │
         ▼
  [Template body inserted into textarea]
  [Placeholders substituted: {{ticket_id}}, {{address}}, {{category_name}}]
         │
         ▼
  [Toggle: "Internal note" ●  ○ "Public response"]
  Diane selects "Public response"
         │
         ▼
  [Submit note → POST /api/staff/tickets/[id]/responses]
         │
         ├── Success ──▶ [Timeline entry animates in]
         │               [Toast: "Response posted — constituent will see this"]
         │               ["Next unread →" button appears]
         │
         └── Empty body ──▶ [Inline error: "Response cannot be empty"]

[Assignee update]
  Diane clicks assignee field → typeahead opens
         │
         ▼
  [GET /api/staff/users?q=...] as user types
  [Select staff member]
         │
         ▼
  [PATCH /api/staff/tickets/[id] with assignee_id]
  [History timeline: ASSIGNMENT entry animates in]

[Media]
  Gallery shows all attached files (thumbnails for images, filename for PDFs)
  Click image → lightbox preview
  Click PDF → download
  "Upload more" → file picker (same validation rules as F00)

[Return to queue]
  Diane clicks breadcrumb "← Tickets" or "Next unread →"
         │
         ▼
  [Queue with previous filter state restored]
  [Updated ticket row reflects new status (optimistic update)]
```

---

## Key UX Notes

- **90-second target:** Search → open → status → response → save must complete within 90s. Template picker with search/filter is the critical speed affordance.
- **No navigation away:** All status, substatus, assignee, and response actions happen on the same ticket detail page. No separate pages or modals that break context.
- **Optimistic updates:** Status badge and history timeline update immediately on confirm; revert if server returns error.
- **"Next unread" navigation:** A forward-navigation button on ticket detail so Diane can move through her queue without returning to the list each time.
- **Template placeholder auto-focus:** After template insertion, cursor is placed at the first `{{...}}` placeholder if any remain unsubstituted.
- **In-page confirmation toast:** "Status updated · note posted · constituent will see this" — 3-second auto-dismiss.
# Flow-04: Admin Category Management
## JRN-03.1 — Renata creates a new service category without a code deployment

**Trigger:** Admin needs to add a new seasonal service category  
**User Stories:** US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-6.6  
**Persona:** Renata Osei (PER-03)  
**Device:** Desktop  

---

## Flow Diagram

```
[Renata logs in as admin → navigates to /admin/categories]
         │
         ▼
[Admin Categories list page]
  Categories grouped by CategoryGroup, sorted by name
  Both active and inactive shown (inactive dimmed)
  Search bar at top, "+ New Category" button
         │
         ├── Click "+ New Category" ──▶ [Drawer slides in from right]
         │
         └── Click existing category row ──▶ [Edit drawer opens with pre-filled data]

[Create/Edit Category Drawer]
  Form fields:
  • Name (required, unique among active)
  • Description (optional textarea)
  • Icon (lucide icon picker with preview)
  • Color (#RRGGBB hex input with color swatch preview)
  • Department (dropdown of active departments only)
  • Anonymous allowed (toggle)
  • Active (toggle)
  • Open311 service_code (text input with inline format hint)
         │
         ▼
[Live preview pane]
  Shows how category card appears in constituent portal
  Updates as user types name, selects icon/color
         │
         ▼
[Validation on blur / submit]
  • service_code: uniqueness checked via API on blur
  • color: regex #RRGGBB validated
  • department_id: must be active
         │
         ├── POST/PATCH /api/admin/categories ──▶ Success:
         │                                         [Drawer closes]
         │                                         [Toast: "Category saved — live in public portal"]
         │                                         ["View in public portal →" shortcut link in toast]
         │                                         [List refreshes]
         │
         ├── Duplicate service_code ──▶ [Field error: "service_code already in use"]
         │
         └── Inactive department ──▶ [Field error: "Selected department is inactive"]

[Deactivate a category]
  User clicks "Deactivate" on a category row
         │
         ▼
[Warning dialog]
  "This category has [N] open tickets. Staff can still manage them."
  [Deactivate anyway]  [Cancel]
         │
         ▼
[Category marked inactive, dimmed in list]
[No longer appears in constituent portal category picker]

[Verify in public portal]
  Renata opens public portal in second tab
  New category appears in dropdown within 60 seconds
  No pod restart required
```

---

## API Key Management Flow (US-6.6 / JRN-03.2)

```
[Renata navigates to /admin/api-keys]
         │
         ▼
[API Keys list]
  Columns: Label, Scope, Created, Last Used, Status
  Active keys: normal; Revoked keys: strikethrough, dimmed
  "+ Generate Key" button (top right)
         │
         ├── Click "+ Generate Key"
         │         │
         │         ▼
         │   [Generate Key dialog]
         │   • Label (required, unique among active)
         │   • Scope: read / write radio
         │   [Generate]
         │         │
         │         ▼
         │   [Key display modal — ONE TIME ONLY]
         │   ┌────────────────────────────────────────┐
         │   │  ⚠ Copy this key now                   │
         │   │  It cannot be shown again               │
         │   │                                         │
         │   │  [•••••••••••••••••••••••••••••••••]   │
         │   │  [Copy key]   countdown: 30s            │
         │   │                                         │
         │   │  [I've copied it — Close]               │
         │   └────────────────────────────────────────┘
         │         │
         │   [Key stored as SHA-256 hash only]
         │   [Plain text never stored]
         │
         └── Click "Revoke" on active key
                   │
                   ▼
           [Confirmation dialog]
           "Revoke [Label]? All subsequent requests will return 401."
           [Revoke]  [Cancel]
                   │
                   ▼
           [PATCH /api/admin/api-keys/[id] with revoked_at]
           [Toast: "Key revoked — all subsequent requests return 401"]
           [Key row shows "Revoked" status immediately]
```

---

## Admin Panel Navigation Structure

```
/admin
  ├── /categories      → Service categories + CategoryGroups
  ├── /departments     → Department management
  ├── /substatuses     → Custom substatuses per status bucket
  ├── /response-templates → Canned response templates
  ├── /users           → Staff user accounts
  └── /api-keys        → Open311 API key management
```

Each admin list page follows the same pattern:
- Search bar (top)
- "+ Create" button (top right)
- Table/list with sortable columns
- Row actions: Edit (drawer), Deactivate/Reactivate
- Breadcrumb: Admin > [Section Name]
# Screen-00: Public Portal Home
## Route: `/`  |  User Stories: US-0.1, US-0.2, US-1.2

**Purpose:** Map-first entry point for constituents to report issues. The map is the hero — takes up the majority of the viewport. The report panel slides in after location is confirmed.

---

## Layout — Mobile (< 768px)

```
┌─────────────────────────────────┐
│ ≡  🏛 Bloomington 311  [Report] │  ← sticky top bar, 56px
├─────────────────────────────────┤
│                                 │
│                                 │
│     LEAFLET MAP                 │  ← full viewport height minus top bar
│     (centered on city)          │     touch-enabled, pinch-to-zoom
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🔍 Search address...     │   │  ← floating search bar, 44px height
│  └─────────────────────────┘   │
│                                 │
│     [ + ]  [ - ]               │  ← zoom controls, 44px buttons
│                                 │
│  [📍 Tap map to report]         │  ← tooltip bubble, auto-dismiss 5s
│                                 │
│  ┌─── Locate me ───────────┐   │  ← GPS location button
│  └─────────────────────────┘   │
└─────────────────────────────────┘
    ↑ After pin placed: bottom sheet slides up (60vh)
```

## Layout — Desktop (> 1024px)

```
┌────────┬────────────────────────────────────────────────────┐
│        │ 🏛 Bloomington 311 Report Portal                    │
│  Side  ├─────────────────────────────────────────────────────┤
│  bar   │                                                     │
│        │            LEAFLET MAP (full width)                 │
│ [📍    │            centered on city, zoom 13                │
│  Report│                                                     │
│  Issue]│   ┌──────────────────────────┐                     │
│        │   │ 🔍 Search address...      │                     │
│ [🔍    │   └──────────────────────────┘                     │
│  Find  │                                                     │
│  Ticket│   [+] [-]                                          │
│        │                                                     │
│ [🗺    │                                                     │
│  Map]  │                                                     │
│        │                                                     │
└────────┴─────────────────────────────────────────────────────┘
     ↑ After pin placed: right panel slides in (420px wide)
```

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Interactive map | Full viewport, behind everything |
| Primary | "Tap to report" affordance | Floating tooltip on first load |
| Secondary | Address search | Floating card, top of map |
| Secondary | Report Issue CTA | Sidebar (desktop) / top bar button (mobile) |
| Tertiary | Find Ticket / Map links | Sidebar nav |
| Tertiary | Zoom controls | Map corner |

---

## States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Map skeleton (gray gradient tile pattern) | "Loading map…" sr-only label |
| Map ready | OpenStreetMap tiles, no pin | "Tap map to place pin" tooltip |
| Pin placed | Colored draggable marker | Address strip at bottom: "📍 [address]  [Change]  [Confirm]" |
| Outside bbox | Yellow warning banner below map | "This location may be outside the city boundary. You can still submit." |
| Geocoder down | Address search field disabled | "Address search temporarily unavailable" tooltip on field |
| Pin confirmed | Report panel opens | Smooth slide-up / slide-in animation |
| Submission in progress | Map dims 40%, spinner overlay | Panel shows "Submitting…" |

---

## Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Map canvas | Leaflet (touch+mouse) | Tap/click to place pin; pinch/scroll to zoom; pan to navigate |
| Draggable pin | Leaflet marker | Drag to reposition; address updates on drag end |
| Address search input | Combobox | Debounced 300ms; up to 5 Nominatim suggestions in dropdown |
| Address suggestion | Dropdown option | Click/Enter: pin moves to lat/lng, field populated |
| Confirm location strip | 2-button bar | "Change" clears pin; "Confirm" opens report panel |
| Zoom + / − | Map controls | Standard Leaflet zoom; also keyboard +/− |
| Locate me | Icon button | Geolocation API; places pin at user position |
| Report Issue (sidebar) | Primary button | Opens report panel without pin (user prompted to place first) |
| Find Ticket (sidebar) | Text link | Navigates to `/tickets` lookup form |

---

## Report Panel — Slide-up Sheet (Mobile)

```
┌──────────────────────────────────────┐
│  ▬▬▬  (drag handle)                 │
│                                      │
│  Report an Issue            [×]      │  ← header with close
│  ●━━━━○━━━━○━━━━○  (step 1 of 4)   │  ← progress indicator
├──────────────────────────────────────┤
│                                      │
│  Category *                          │
│  ┌────────────────────────────────┐  │
│  │ Select a category...        ▾  │  │
│  └────────────────────────────────┘  │
│  Routed to: Public Works Dept        │  ← dynamic dept hint
│                                      │
│  ℹ No account needed — leave         │  ← anon notice (conditional)
│    contact fields blank to submit    │
│    anonymously                       │
│                                      │
│  [Next →]                            │
└──────────────────────────────────────┘
```

(Steps 2–4 use the same sheet with back/next navigation)

---

## Accessibility Notes (this screen)

- Map container: `role="application"` `aria-label="City issue reporting map. Use arrow keys to pan, + and - to zoom. Press Enter to place a pin at the center."`
- Address search: `role="combobox"` `aria-autocomplete="list"` `aria-expanded` managed
- Pin placed: `aria-live="polite"` region announces "Pin placed at [address]"
- Out-of-bounds warning: `role="alert"` so screen readers announce it immediately
- All touch targets ≥ 44×44px
- Color is never the sole indicator of meaning
# Screen-01: Report Submission Form (Panel)
## Route: `/` (slide-up sheet / side panel)  |  User Stories: US-0.3, US-0.4, US-0.5

**Purpose:** Multi-step form for submitting a new ticket. Opens after location is confirmed.

---

## Layout — Step 1: Category & Description (Mobile)

```
┌──────────────────────────────────────┐
│  ▬▬▬                                │
│  Report an Issue            [×]      │
│  ● ─ ○ ─ ○ ─ ○   Step 1 of 4       │
├──────────────────────────────────────┤
│  📍 123 Oak Street           [Edit]  │  ← confirmed location, tappable to go back
├──────────────────────────────────────┤
│                                      │
│  Category *                          │
│  ┌────────────────────────────────┐  │
│  │ 🕳 Pothole / Road Damage     ▾ │  │
│  └────────────────────────────────┘  │
│  ↳ Routed to: Public Works           │
│                                      │
│  ℹ This category allows anonymous    │
│    submissions.                      │
│                                      │
│  Description *                       │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │                                │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│  0 / 4000 characters                 │
│                                      │
├──────────────────────────────────────┤
│          [← Back]   [Next →]         │
└──────────────────────────────────────┘
```

---

## Layout — Step 2: Photo Upload (Mobile)

```
┌──────────────────────────────────────┐
│  ▬▬▬                                │
│  Report an Issue            [×]      │
│  ● ─ ● ─ ○ ─ ○   Step 2 of 4       │
├──────────────────────────────────────┤
│                                      │
│  Add Photos  (optional)              │
│                                      │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  │    📷                          │  │
│  │    Tap to add photos           │  │
│  │    or drag and drop            │  │
│  │    JPEG, PNG, PDF · max 10MB   │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│  (After upload — 2-col thumbnail grid appears)
│  ┌────────┐  ┌────────┐             │
│  │ [img]  │  │ [img]  │             │
│  │      × │  │      × │             │
│  └────────┘  └────────┘             │
│  0 / 5 files                        │
│                                      │
├──────────────────────────────────────┤
│          [← Back]   [Next →]         │
└──────────────────────────────────────┘
```

---

## Layout — Step 3: Contact Info (Mobile)

```
┌──────────────────────────────────────┐
│  ▬▬▬                                │
│  Report an Issue            [×]      │
│  ● ─ ● ─ ● ─ ○   Step 3 of 4       │
├──────────────────────────────────────┤
│                                      │
│  Contact Information                 │
│  (optional — leave blank to submit   │
│   anonymously)                       │
│                                      │
│  Name                                │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  Email                               │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  Phone  (always optional)            │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│          [← Back]   [Next →]         │
└──────────────────────────────────────┘
```

When `anon_allowed = false`: Name and Email labels change to "Name *" and "Email *" with `aria-required="true"`. The anonymous note is replaced with: "Contact information required for this category."

---

## Layout — Step 4: Review & Submit (Mobile)

```
┌──────────────────────────────────────┐
│  ▬▬▬                                │
│  Report an Issue            [×]      │
│  ● ─ ● ─ ● ─ ●   Step 4 of 4       │
├──────────────────────────────────────┤
│  Review your report                  │
│                                      │
│  📍 123 Oak Street             [Edit]│
│  🏷 Pothole / Road Damage      [Edit]│
│  📝 "Large pothole causing..."  [Edit]│
│  📷 1 photo attached           [Edit]│
│  👤 Anonymous submission             │
│                                      │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │   Submit Report                │  │  ← primary action button, full width
│  └────────────────────────────────┘  │
│                                      │
│  By submitting, your report will be  │
│  sent to the City of Bloomington.    │
└──────────────────────────────────────┘
   ↓ On tap: button → "Submitting…" + spinner
   ↓ On success: navigate to /tickets/[id]/confirm
```

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Category selector | Step 1, top |
| Primary | Description textarea | Step 1, below category |
| Primary | Submit button | Step 4, full-width CTA |
| Secondary | Location confirmation bar | All steps, top of panel |
| Secondary | Progress indicator | All steps, header |
| Secondary | Photo upload | Step 2 |
| Tertiary | Contact fields | Step 3 (optional) |
| Tertiary | Anonymous notice | Step 1 & 3 (conditional) |
| Tertiary | Review summary | Step 4 |

---

## States per Step

| Step | State | Appearance |
|------|-------|------------|
| Category | Empty | Placeholder "Select a category…" |
| Category | Error (no selection) | Red border + "Please select a category" |
| Category | Selected | Icon + name shown; dept hint visible |
| Description | Empty | Placeholder "Describe the issue…" |
| Description | < 10 chars + blur | Red border + "Must be at least 10 characters" |
| Description | Valid | Green check icon, char counter normal |
| Description | Near limit (>3800) | Counter turns red |
| Photo | Empty | Drop zone with camera icon |
| Photo | Uploading | Progress bar per file |
| Photo | Too large | Red badge on file: "Too large (max 10MB)" |
| Photo | Wrong type | Red badge: "File type not supported" |
| Photo | Success | Thumbnail + × remove |
| Contact | anon_allowed=true | All fields optional, soft hint text |
| Contact | anon_allowed=false | Name+Email required, red asterisk |
| Contact | Invalid email | "Please enter a valid email address" |
| Submit | Default | Primary color button, enabled |
| Submit | Loading | Spinner, "Submitting…", all fields disabled |
| Submit | 422 error | Error banner + field-level errors reappear |
| Submit | 500 error | Red banner: "Submission failed — please try again" + retry button |

---

## Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Category `<Select>` | Combobox | Lists active categories with icons; keyboard navigable |
| Description `<Textarea>` | Text input | Auto-resize up to 8 rows; char counter |
| Photo drop zone | File input | Drag-and-drop; tap to open native file picker |
| Photo thumbnail × | Icon button | Removes file from list |
| Back button | Secondary | Returns to previous step; no data loss |
| Next button | Primary | Validates current step; advances only if valid |
| Edit links (step 4) | Text link | Jumps back to that step with data intact |
| Submit button | Primary CTA | Client validate → POST; disabled while loading |

---

## Accessibility Notes

- Progress indicator: `aria-label="Step [N] of 4: [Step Name]"` on `<ol>` element
- Each step labeled with `<h2>` for screen reader section heading
- Error messages: `role="alert"` or `aria-describedby` on field + error `<span>`
- File input: `aria-label="Upload photos (optional)"`, keyboard accessible
- Back/Next buttons: `aria-label="Go to step [N]"` to disambiguate
# Screen-02: Confirmation & Public Ticket Status
## Routes: `/tickets/[id]/confirm` and `/tickets/[id]`
## User Stories: US-0.6, US-1.1, US-1.3

---

## Screen: Submission Confirmation (`/tickets/[id]/confirm`)

**Purpose:** Confirm submission succeeded. Display ticket ID prominently. Encourage user to save the reference.

### Layout — Mobile

```
┌─────────────────────────────────────┐
│ ≡  🏛 Bloomington 311               │
├─────────────────────────────────────┤
│                                     │
│         ✅                          │
│   Your report was submitted!        │  ← h1, large
│                                     │
│   ┌─────────────────────────────┐   │
│   │  Your Ticket ID             │   │
│   │                             │   │
│   │   BRK-2847                  │   │  ← reference_id, 3xl font, bold
│   │                             │   │
│   │  [📋 Copy ID]               │   │  ← copies to clipboard
│   └─────────────────────────────┘   │
│                                     │
│   Save this ID to track your report │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  [🔗 Copy shareable link]   │   │  ← copies /tickets/[id] URL
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │  Track this report →        │   │  ← link to /tickets/[id]
│   └─────────────────────────────┘   │
│                                     │
│   ─────────────────────────────     │
│   Report another issue?             │
│   [+ Report a new issue]            │  ← navigates to /
│                                     │
└─────────────────────────────────────┘
```

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default | Green check icon, ticket ID card | — |
| Copy ID success | Button flashes, text → "Copied!" for 2s | `aria-live` announces "Ticket ID copied" |
| Copy link success | Same pattern | `aria-live` announces "Link copied" |

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Ticket reference ID | Large card, center |
| Primary | "Copy ID" button | Inside ticket ID card |
| Secondary | Shareable link | Second button below ID card |
| Secondary | "Track this report" link | Below link button |
| Tertiary | "Report another issue" | Bottom of page |

---

## Screen: Public Ticket Status (`/tickets/[id]`)

**Purpose:** Show public-safe ticket information to any visitor. No authentication required.

### Layout — Mobile

```
┌─────────────────────────────────────┐
│ ≡  🏛 Bloomington 311               │
├─────────────────────────────────────┤
│                                     │
│  ← Back to map                      │
│                                     │
│  Ticket #BRK-2847                   │  ← h1
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🕳 Pothole / Road Damage   │   │
│  │  Status: ● In Progress      │   │  ← status badge (color-coded)
│  │  Submitted: Jun 30, 2026    │   │
│  │  Updated: Jul 3, 2026       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📍 Location                │   │
│  │  123 Oak Street, Bloomington│   │
│  │  ┌───────────────────────┐  │   │
│  │  │  [Leaflet mini-map]   │  │   │  ← 200px tall, no interaction needed
│  │  │  with marker pin      │  │   │
│  │  └───────────────────────┘  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📢 City Updates             │   │
│  │                             │   │
│  │  Jul 3 — Paving crew        │   │  ← public responses only
│  │  scheduled for week of      │   │
│  │  Jul 13. Thank you for      │   │
│  │  reporting!                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  [🔗 Copy link to this ticket]      │
│                                     │
│  ─────────────────────────────      │
│  See all open issues near you       │
│  [View public map →]                │
└─────────────────────────────────────┘
```

### Layout — Desktop

```
┌────────┬────────────────────────────────────────────┐
│        │  ← Back to map                             │
│ Side   │                                            │
│ bar    │  Ticket #BRK-2847              [🔗 Copy]   │
│        │                                            │
│        │  ┌─────────────────┐  ┌─────────────────┐ │
│        │  │  🕳 Pothole /   │  │  📍 Location    │ │
│        │  │  Road Damage    │  │  123 Oak St.    │ │
│        │  │  ● In Progress  │  │  [mini-map]     │ │
│        │  │  Jun 30, 2026   │  │                 │ │
│        │  │  Updated Jul 3  │  │                 │ │
│        │  └─────────────────┘  └─────────────────┘ │
│        │                                            │
│        │  ┌─────────────────────────────────────┐  │
│        │  │  📢 City Updates                     │  │
│        │  │  Jul 3 — Paving crew scheduled...    │  │
│        │  └─────────────────────────────────────┘  │
└────────┴────────────────────────────────────────────┘
```

### Status Badge Colors

| Status | Badge Style |
|--------|-------------|
| `open` | Blue outline badge: "Open" |
| `in_progress` | Amber filled badge: "In Progress" |
| `closed` | Green filled badge: "Closed" |
| `archived` | Gray filled badge: "Archived" |

*Note: Color is supplemented by status text — never color alone.*

### States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton cards | — |
| Ticket found | Full page renders | — |
| Ticket not found | 404 page: "Ticket not found" + [Report an issue] link | HTTP 404 |
| No public responses | "No updates yet" placeholder in City Updates card | — |
| Copy link success | "Copied!" flash on button | `aria-live` "Link copied" |

### Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Ticket ID + status | Header card |
| Primary | City updates / public responses | Second card |
| Secondary | Location + mini-map | Location card |
| Secondary | Copy link | Top right / bottom button |
| Tertiary | Submission / update dates | Inside status card |
| Tertiary | "View public map" link | Page footer |

### Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Mini-map | Leaflet (static view) | Shows pin; no interaction; `aria-label="Map showing issue location"` |
| Copy link button | Button | Copies `/tickets/[id]` URL to clipboard |
| View public map link | Text link | Navigates to `/map` |
| Back to map | Text link | Navigates to `/` |
# Screen-03: Login
## Route: `/login`  |  User Stories: US-2.1, US-2.2

**Purpose:** Staff and admin authentication. No self-registration. No OAuth.

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│                 🏛 Bloomington 311                   │  ← centered logo/wordmark
│                                                     │
│         ┌───────────────────────────────┐           │
│         │                               │           │
│         │   Staff Login                 │           │  ← card, 400px max-width
│         │                               │           │
│         │   Username                    │           │
│         │   ┌─────────────────────┐    │           │
│         │   │                     │    │           │
│         │   └─────────────────────┘    │           │
│         │                               │           │
│         │   Password                    │           │
│         │   ┌─────────────────────┐    │           │
│         │   │                  👁 │    │           │  ← show/hide password toggle
│         │   └─────────────────────┘    │           │
│         │                               │           │
│         │   ┌─────────────────────┐    │           │
│         │   │   Sign In           │    │           │  ← primary button, full width
│         │   └─────────────────────┘    │           │
│         │                               │           │
│         └───────────────────────────────┘           │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Username + password fields | Center of card |
| Primary | Sign In button | Below fields |
| Secondary | Page title "Staff Login" | Card header |
| Tertiary | City logo/wordmark | Above card |

---

## States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default | Empty form | — |
| Loading | Spinner in button, "Signing in…", fields disabled | — |
| Invalid credentials | Red error banner below form: "Invalid username or password" | `role="alert"` |
| Redirected from protected route | Blue info banner: "Please sign in to continue" | `role="alert"` |
| Session expired | Amber info banner: "Your session has expired. Please sign in again." | `role="alert"` |
| Success | Redirect to `callbackUrl` (default `/staff/tickets`) | — |

---

## Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Username input | `<input type="text">` | `autocomplete="username"` |
| Password input | `<input type="password">` | `autocomplete="current-password"` |
| Show/hide password | Icon toggle button | Toggles `type` between `password` / `text`; `aria-label` updates |
| Sign In button | Primary button | Submits form; shows spinner during POST |
| Error banner | Alert | `role="alert"` auto-announced to screen readers |

---

## Security Notes (UX)

- Error message is always the same generic string regardless of whether username or password was wrong — no enumeration
- Password field has `autocomplete="current-password"` to support password managers
- `callbackUrl` param in URL is used for post-login redirect (preserved through form submission)
- No "Remember me" checkbox in v1 (session TTL configurable server-side via `AUTH_SESSION_TTL`)
# Screen-04: Staff Ticket Queue
## Route: `/staff/tickets`  |  User Stories: US-3.1, US-3.2, US-3.3, US-3.4, US-3.5

**Purpose:** Primary staff workspace. Filterable, searchable, bookmarkable ticket list. Supports bulk actions and map view toggle.

---

## Layout — Desktop (> 1024px)

```
┌────────────────┬────────────────────────────────────────────────────────────┐
│  🏛 Staff      │  Tickets                              [+ New]  [Map View 🗺] │
│                ├──────────────────────────────────────────────────────────── │
│  📋 Tickets    │  ┌──────────────────────────────────────────────────────┐  │
│  👥 People     │  │ 🔍 Search tickets...            [Filters ▾] [↕ Sort] │  │  ← sticky filter bar
│  📊 Reports    │  └──────────────────────────────────────────────────────┘  │
│                ├──────────────────────────────────────────────────────────── │
│  ── Views ──  │  ┌── Filter Panel (collapsible) ──────────────────────────┐ │
│  [📌 My Dept  │  │ Category: [All ▾]  Dept: [All ▾]  Status: [All ▾]     │ │
│    Overnight] │  │ Assignee: [Anyone ▾]  Date: [From────To]  [Clear all]  │ │
│               │  └────────────────────────────────────────────────────────┘ │
│  [+ Save View]│                                                              │
│                │  [☐] [Select all new]  3 tickets selected  ── Bulk bar ── │
│  ── Account ─ │  ┌────────────────────────────────────────────────────────┐ │
│  [👤 Account] │  │ [☐] ID        Category   Status      Assignee   Date   │ │
│  [🚪 Sign out]│  ├────────────────────────────────────────────────────────┤ │
│                │  │ [☐] BRK-2847 🔵 Pothole  ● In Prog  D. Kow.   2h ago │ │
│                │  │     ← NEW badge →                                      │ │
│                │  ├────────────────────────────────────────────────────────┤ │
│                │  │ [☐] BRK-2846 🟡 Graffiti ○ Open     Unassigned 3h ago │ │
│                │  ├────────────────────────────────────────────────────────┤ │
│                │  │ [☐] BRK-2845 🔵 Pothole  ● In Prog  J. Smith  5h ago  │ │
│                │  └────────────────────────────────────────────────────────┘ │
│                │                                                              │
│                │  [← Prev]  Page 1 of 12  (297 tickets)  [Next →]           │
└────────────────┴──────────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile (< 768px)

```
┌─────────────────────────────────────┐
│ ≡  🏛 Staff Tickets       [🗺] [⚙]  │  ← hamburger, map toggle, filter icon
├─────────────────────────────────────┤
│ 🔍 Search tickets...                │
├─────────────────────────────────────┤
│ BRK-2847  🔵 Pothole                │  ← card-style rows on mobile
│ ● In Progress · 2h ago              │
│ 📍 123 Oak Street         [NEW]     │
├─────────────────────────────────────┤
│ BRK-2846  🟡 Graffiti               │
│ ○ Open · 3h ago                     │
│ 📍 456 Elm Street                   │
├─────────────────────────────────────┤
│ BRK-2845  🔵 Pothole                │
│ ● In Progress · 5h ago              │
│ 📍 789 Maple Ave                    │
├─────────────────────────────────────┤
│        [Load more...]               │
└─────────────────────────────────────┘
  ↑ Sticky bulk action bar when ≥1 selected (bottom):
┌─────────────────────────────────────┐
│ 3 selected  [Status ▾]  [Assign ▾]  │
└─────────────────────────────────────┘
```

---

## Filter Panel (Expanded)

```
┌────────────────────────────────────────────┐
│  Filters                          [Clear all] │
├────────────────────────────────────────────┤
│  Category                                   │
│  ┌──────────────────────────────────────┐  │
│  │ All categories                     ▾ │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Department                                 │
│  ┌──────────────────────────────────────┐  │
│  │ All departments                    ▾ │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Status                                     │
│  [○ All]  [○ Open]  [○ In Progress]        │
│  [○ Closed]  [○ Archived]                  │
│                                             │
│  Assignee                                   │
│  ┌──────────────────────────────────────┐  │
│  │ Anyone                             ▾ │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Date Range                                 │
│  From: [────────────]  To: [────────────]  │
│                                             │
│  [Apply Filters]                            │
└────────────────────────────────────────────┘
```

---

## Quick-View Popover (Row Hover)

```
┌─────────────────────────────────────────────┐
│  BRK-2847 · Pothole / Road Damage           │
│  ● In Progress · Crew Scheduled             │
│  📍 123 Oak Street                          │
│                                             │
│  "Large pothole causing vehicle damage..."  │  ← description excerpt
│                                             │
│  [🖼 thumbnail]  Assigned: D. Kowalski      │
│  Submitted 2 hours ago                      │
│                                             │
│  [Open ticket →]                            │
└─────────────────────────────────────────────┘
```

---

## Map View Toggle

When "Map View" is active, the ticket list is replaced by a Leaflet map:

```
┌────────────────┬────────────────────────────────────────────┐
│  sidebar       │  [← List View]  Filtered Tickets (map)     │
│                ├────────────────────────────────────────────┤
│                │                                            │
│                │       LEAFLET MAP                          │
│                │       Filtered tickets as markers          │
│                │       Clustered at zoom < 14               │
│                │                                            │
│                │   Click marker → ticket popup:             │
│                │   [BRK-2847 · Pothole · In Progress]       │
│                │   [View ticket →]                          │
│                │                                            │
└────────────────┴────────────────────────────────────────────┘
```

---

## Bulk Action Bar (Sticky)

Appears at bottom of viewport when ≥1 ticket is checked:

```
┌──────────────────────────────────────────────────────────────┐
│  ☑ 5 tickets selected                                        │
│  [Update Status ▾]  [Assign To ▾]  [Clear selection]        │
└──────────────────────────────────────────────────────────────┘
```

- Max 100 tickets per bulk action
- Dropdown opens a picker (status or staff member)
- After confirm: spinner, then toast "5 tickets updated"
- Failed IDs shown in expandable error list

---

## Saved Views Sidebar Section

```
── Saved Views ──────────────
📌 My Dept — Open (Overnight)
📌 Unassigned — Pothole
📌 Closed This Week
[+ Save current view]
[⋮] → Rename / Delete
─────────────────────────────
```

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Ticket list / map | Main content area |
| Primary | Search bar | Sticky top of content |
| Secondary | Filter panel | Collapsible below search bar |
| Secondary | Bulk action bar | Sticky bottom (conditional) |
| Secondary | Saved views | Sidebar section |
| Tertiary | Pagination controls | Bottom of list |
| Tertiary | Sort controls | Filter bar right side |

---

## States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton rows (3 animated placeholder rows) | — |
| Empty (no tickets) | Empty state card: "No tickets match your filters" + [Clear filters] | — |
| Empty (search) | "No results for '[query]'" + suggestions | — |
| Filters applied | Active filter chips below search bar; [Clear all] link | Filter count badge on "Filters" button |
| Bulk selected | Row checkboxes filled; sticky bulk bar | "[N] tickets selected" |
| Bulk loading | Bulk bar spinner, rows disabled | "Updating…" |
| Bulk success | Toast: "[N] tickets updated" | Rows update in-place |
| Bulk error | Error toast with failed count | "[N] failed. View details ▾" |

---

## Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Search input | Text + submit | Debounced 400ms; clears with × |
| Filter panel toggle | Button | Expands/collapses filter form |
| Column header sort | Click | Toggles asc/desc; URL updated |
| Row checkbox | Checkbox | Adds to bulk selection |
| Header "select all" | Checkbox | Selects all on current page |
| "Select all new" | Text button | Selects only new-since-login rows |
| Row click | Navigation | Opens `/staff/tickets/[id]` |
| Row hover | Hover intent (300ms) | Shows quick-view popover |
| Saved view | Click | Loads filter state; fetches queue |
| Save view button | Button | Opens name dialog |
| Map view toggle | Toggle button | Switches list ↔ map; preserves filters |
| Pagination prev/next | Buttons | Navigate pages; URL updated |
# Screen-05: Staff Ticket Detail
## Route: `/staff/tickets/[id]`  |  User Stories: US-4.1–US-4.6

**Purpose:** Full single-ticket workspace. All ticket information, history, actions, and media on one page.

---

## Layout — Desktop (> 1024px)

```
┌────────────────┬────────────────────────────────────────────────────────┐
│  sidebar       │  ← Tickets                     [Next unread →]         │
│                ├────────────────────────────────────────────────────────│
│                │  BRK-2847 · Pothole / Road Damage                      │
│                │  Public Works · ● In Progress · Crew Scheduled         │
│                │  123 Oak Street                                         │
│                ├──────────────────────┬─────────────────────────────────│
│                │                      │                                  │
│                │  ┌────────────────┐  │  ┌──────────────────────────┐  │
│                │  │  Leaflet       │  │  │  Status & Assignment      │  │
│                │  │  mini-map      │  │  │                          │  │
│                │  │  (200px tall)  │  │  │  Status:                 │  │
│                │  │  issue pin     │  │  │  [● In Progress      ▾]  │  │
│                │  └────────────────┘  │  │                          │  │
│                │                      │  │  Substatus:              │  │
│                │                      │  │  [Crew Scheduled     ▾]  │  │
│                │                      │  │                          │  │
│                │                      │  │  Assignee:               │  │
│                │                      │  │  [🔍 Search staff... ▾]  │  │
│                │                      │  │  D. Kowalski   [×]       │  │
│                │                      │  └──────────────────────────┘  │
│                ├──────────────────────┴─────────────────────────────────│
│                │                                                         │
│                │  ┌────── Compose Response ──────────────────────────┐  │
│                │  │  [Internal note ●]  [Public response ○]          │  │
│                │  │  [Insert template ▾]                              │  │
│                │  │  ┌────────────────────────────────────────────┐  │  │
│                │  │  │                                            │  │  │
│                │  │  │  (response textarea)                       │  │  │
│                │  │  │                                            │  │  │
│                │  │  └────────────────────────────────────────────┘  │  │
│                │  │  0 / 10000 chars          [Submit Response]      │  │
│                │  └──────────────────────────────────────────────────┘  │
│                │                                                         │
│                ├─────────────────────────────────────────────────────────│
│                │  History Timeline                                        │
│                │  ┌─────────────────────────────────────────────────┐   │
│                │  │ ● Jul 3, 2026 10:42 AM · D. Kowalski            │   │
│                │  │   STATUS_CHANGE: Open → In Progress             │   │
│                │  │   Note: "Crew assigned and scheduled"           │   │
│                │  │                                                  │   │
│                │  │ ● Jul 3, 2026 10:40 AM · D. Kowalski            │   │
│                │  │   RESPONSE (public): "Paving crew scheduled..." │   │
│                │  │                                                  │   │
│                │  │ ● Jun 30, 2026 2:15 PM · [System]               │   │
│                │  │   Ticket submitted                               │   │
│                │  └─────────────────────────────────────────────────┘   │
│                │                                                         │
│                ├─────────────────────────────────────────────────────────│
│                │  Media Gallery        [+ Upload more]                   │
│                │  ┌──────┐  ┌──────┐  ┌──────┐                         │
│                │  │[img] │  │[img] │  │[pdf] │                         │
│                │  │      │  │      │  │ doc  │                         │
│                │  └──────┘  └──────┘  └──────┘                         │
│                │                                                         │
│                ├─────────────────────────────────────────────────────────│
│                │  ┌─── Linked Constituent ─────────────────────────┐    │
│                │  │  [No contact linked]         [Link person +]   │    │
│                │  └────────────────────────────────────────────────┘    │
│                │                                                         │
│                │  ┌─── Related Tickets ────────────────────────────┐    │
│                │  │  BRK-2843 · Pothole · 120 Oak St · Open         │    │
│                │  │  BRK-2801 · Pothole · 123 Oak St · Closed       │    │
│                │  └────────────────────────────────────────────────┘    │
└────────────────┴─────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile (< 768px)

On mobile the sections stack vertically and are collapsed into `<details>` / accordion sections:
1. Header (always visible): ID, category, status badge, address
2. Map (collapsible: "Show on map")
3. Status & Assignment (always visible)
4. Compose Response (always visible)
5. History Timeline (collapsed by default, "Show history [N entries]")
6. Media Gallery (collapsed: "Show photos [N]")
7. Linked Constituent (collapsed)
8. Related Tickets (collapsed)

---

## Status Change — Confirmation Dialog

```
┌────────────────────────────────────────┐
│  Update Status                    [×]  │
│                                        │
│  Open  →  In Progress                  │
│                                        │
│  Add an internal note (optional)       │
│  ┌────────────────────────────────┐   │
│  │                                │   │
│  └────────────────────────────────┘   │
│                                        │
│  [Cancel]              [Confirm]       │
└────────────────────────────────────────┘
```

- For `closed → open`: only shown to admin role. Staff sees: "Only admins can re-open closed tickets."
- Confirm button = primary color; Cancel = ghost

---

## Response Composer

```
┌──────────────────────────────────────────────────────┐
│  [Internal note ●]  [Public response ○]              │  ← toggle
│                                                      │
│  ⚠ Internal notes are only visible to staff          │  ← dynamic hint based on toggle
│  (or: ✅ Constituents will see this response)        │
│                                                      │
│  [Insert template ▾]                                 │  ← dropdown
│  ┌────────────────────────────────────────────────┐  │
│  │                                                │  │
│  │                                                │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│  0 / 10000                          [Submit Response] │
└──────────────────────────────────────────────────────┘
```

**Template Picker Dropdown:**
```
┌─────────────────────────────────────────────┐
│ 🔍 Filter templates...                       │
├─────────────────────────────────────────────┤
│ Paving Crew Scheduled                        │  ← template name
│ "Dear resident, a paving crew has been..."   │  ← first ~60 chars of body
├─────────────────────────────────────────────┤
│ Graffiti Removal Scheduled                   │
│ "We have received your report..."            │
├─────────────────────────────────────────────┤
│ Additional Information Needed                │
│ "Thank you for your report. To help us..."   │
└─────────────────────────────────────────────┘
```

---

## History Timeline Entry Types

| Action | Icon | Display |
|--------|------|---------|
| `STATUS_CHANGE` | 🔄 arrows | "Status changed: [from] → [to]" |
| `ASSIGNMENT` | 👤 person | "Assigned to [name]" or "Unassigned" |
| `RESPONSE` (internal) | 📝 note | "[Staff name]: [note excerpt]" + lock icon |
| `RESPONSE` (public) | 📢 megaphone | "[Staff name]: [note excerpt]" + globe icon |
| `MEDIA_ADDED` | 📎 clip | "[filename] uploaded by [name]" |
| `SUBSTATUS_CHANGE` | 🏷 tag | "Substatus: [from] → [to]" |
| `PERSON_LINKED` | 🔗 link | "Person [name] linked" |
| `TICKET_SUBMITTED` | ✅ check | "Ticket submitted [by anonymous / by name]" |

---

## Media Gallery

```
┌─── Media Gallery (3 files) ─────── [+ Upload more] ────┐
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │          │  │          │  │  📄                  │  │
│  │  [photo] │  │  [photo] │  │  pothole_report.pdf  │  │
│  │          │  │          │  │  uploaded Jun 30     │  │
│  │ Jun 30   │  │ Jul 3    │  │                      │  │
│  │ [↓ Save] │  │ [↓ Save] │  │  [↓ Download]        │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

- Click image → lightbox with full-size preview + download button
- Click PDF → download (no in-browser preview)
- Upload: same file picker as public portal (≤5, ≤10MB, image/* or pdf)

---

## Linked Constituent Panel

```
┌── Linked Constituent ──────────────────────── [Link person +] ──┐
│                                                                  │
│  [If linked:]                                                    │
│  👤 Marcus Webb                                                  │
│  ✉ m.webb@email.com   📱 555-0198                               │
│  Submitter  [View full profile →]  [Unlink ×]                   │
│                                                                  │
│  [If not linked:]                                                │
│  No constituent linked.                                          │
│  [Link a person →]                                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Ticket ID, category, status, address | Sticky header |
| Primary | Status/substatus selector + assignee | Top-right control panel |
| Primary | Response composer | Below header controls |
| Secondary | History timeline | Middle section |
| Secondary | Media gallery | Below timeline |
| Secondary | Mini-map | Top-left alongside controls |
| Tertiary | Linked constituent | Bottom panel |
| Tertiary | Related tickets | Bottom panel |

---

## States

| Section | State | Appearance |
|---------|-------|------------|
| Status dropdown | Updating | Spinner; disabled |
| Status dropdown | Error | Toast: "Failed to update status" + revert |
| Response | Submitting | Spinner in Submit button |
| Response | Success | Timeline animates in new entry; textarea clears |
| Response | Empty error | "Response body cannot be empty" inline error |
| Media | No files | "No photos yet" + upload CTA |
| Media | Uploading | Progress bar per file |
| Related tickets | None nearby | "No related tickets found" |
| Timeline | Loading | Skeleton entries |
# Screen-06: Staff People (CRM)
## Routes: `/staff/people` and `/staff/people/[id]`
## User Stories: US-5.1, US-5.2, US-5.3, US-5.4, US-5.5

**Purpose:** Staff-only CRM for searching, viewing, linking, merging, and anonymizing constituent records.

---

## Screen: People Search (`/staff/people`)

### Layout — Desktop

```
┌────────────────┬────────────────────────────────────────────────────┐
│  sidebar       │  People Search                                      │
│                ├─────────────────────────────────────────────────────│
│                │  ┌──────────────────────────────────────────────┐  │
│                │  │ 🔍 Search by name, email, or phone...         │  │
│                │  └──────────────────────────────────────────────┘  │
│                │                                                     │
│                │  ┌─────────────────────────────────────────────┐   │
│                │  │ Name            Email         Tickets  Last  │   │
│                │  ├─────────────────────────────────────────────┤   │
│                │  │ Marcus Webb     m.w@email.com    3     2h ago│   │
│                │  ├─────────────────────────────────────────────┤   │
│                │  │ Anonymous       —               1     3d ago │   │  ← anonymized
│                │  ├─────────────────────────────────────────────┤   │
│                │  │ Sarah Chen      s.c@email.com    7     1w ago│   │
│                │  └─────────────────────────────────────────────┘   │
│                │  Showing 3 of 47 results                            │
└────────────────┴─────────────────────────────────────────────────────┘
```

### States

| State | Appearance |
|-------|------------|
| Empty search | "Enter at least 2 characters to search" placeholder |
| Loading | Skeleton rows |
| No results | "No matching contacts found. Check spelling or try a different term." |
| Anonymized person | Row shows "Anonymous Constituent" — no email/phone |
| Results | Paginated list, click row → person detail |

---

## Screen: Person Detail (`/staff/people/[id]`)

### Layout — Desktop

```
┌────────────────┬────────────────────────────────────────────────────────┐
│  sidebar       │  ← People                                               │
│                ├────────────────────────────────────────────────────────│
│                │  👤 Marcus Webb                          [⋮ Actions ▾] │
│                │                                                         │
│                │  ┌── Contact Info ──────────────────────────────────┐  │
│                │  │  ✉ m.webb@email.com                              │  │
│                │  │  📱 555-0198                                      │  │
│                │  │  Preferred: Email                                 │  │
│                │  │  Notes: Regular reporter in north district        │  │
│                │  └──────────────────────────────────────────────────┘  │
│                │                                                         │
│                │  ┌── Linked Tickets (3) ───────────────────────────┐   │
│                │  │ BRK-2847 · Pothole · In Progress · Jul 3 2026   │   │
│                │  │ BRK-2831 · Graffiti · Closed · Jun 20 2026      │   │
│                │  │ BRK-2805 · Pothole · Closed · Jun 1 2026        │   │
│                │  └──────────────────────────────────────────────────┘  │
│                │                                                         │
│                │  Actions (via [⋮] menu):                               │
│                │  • Merge with…                                          │
│                │  • Anonymize Record (destructive)                       │
└────────────────┴────────────────────────────────────────────────────────┘
```

---

## Merge Dialog

Opened from "Merge with…" action:

```
┌────────────────────────────────────────────────┐
│  Merge with Another Contact                [×] │
│                                                │
│  SOURCE (will be removed):                     │
│  Marcus Webb · m.webb@email.com · 3 tickets    │
│                                                │
│  TARGET (canonical — will be kept):            │
│  🔍 Search for the canonical contact...        │
│  ┌────────────────────────────────────────┐   │
│  │ M. Webb   m.webb2@email.com  1 ticket  │   │  ← search result
│  └────────────────────────────────────────┘   │
│                                                │
│  ⚠ All 3 tickets will be linked to the target  │
│  record. The source will be removed.           │
│                                                │
│  [Cancel]               [Merge Records]        │
└────────────────────────────────────────────────┘
```

---

## Anonymize Confirmation Dialog

```
┌────────────────────────────────────────────────┐
│  Anonymize Record                          [×] │
│                                                │
│  ⚠ This action is PERMANENT and cannot be     │
│  undone.                                       │
│                                                │
│  All personal information will be removed:     │
│  • Name, email, phone, notes                  │
│  • Will display as "Anonymous Constituent"    │
│                                                │
│  Linked tickets (3) will NOT be deleted.       │
│                                                │
│  [Cancel]               [Anonymize]            │  ← destructive = red
└────────────────────────────────────────────────┘
```

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Contact info (name, email, phone) | Top card |
| Primary | Linked tickets list | Second card |
| Secondary | Notes / preferred contact | Inside contact card |
| Secondary | Actions menu | Top right |
| Tertiary | Merge / anonymize (destructive) | Actions dropdown |

---

## States

| State | Appearance |
|-------|------------|
| Anonymized person | All PII replaced with "—"; banner: "This record has been anonymized" |
| Merge loading | Spinner on confirm button |
| Merge success | Toast: "[N] tickets relinked"; source record removed from search |
| Anonymize success | All PII cleared; banner shown; action menu removes "Anonymize" option |
| Already anonymized | "Anonymize" option grayed out with tooltip "Already anonymized" |
# Screen-07: Staff Reports Dashboard
## Route: `/staff/reports`  |  User Stories: US-8.1, US-8.2, US-8.3, US-8.4

**Purpose:** Analytics dashboard with ticket volume charts, open/closed breakdown, resolution time, geographic density map, and CSV export.

---

## Layout — Desktop

```
┌────────────────┬────────────────────────────────────────────────────────────┐
│  sidebar       │  Reports & Metrics                                          │
│                ├──────────────────────────────────────────────────────────── │
│                │  ┌── Date Range ──────────────────────────────────────────┐ │
│                │  │ [Last 7d]  [Last 30d]  [Last 90d]  [Custom: ── to ──] │ │  ← sticky
│                │  │                                     [Export CSV ↓]     │ │
│                │  └────────────────────────────────────────────────────────┘ │
│                ├──────────────────────────────────────────────────────────── │
│                │                                                              │
│                │  ┌── Row 1: Volume Charts ─────────────────────────────┐   │
│                │  │                                                      │   │
│                │  │  ┌──────────────────────┐  ┌─────────────────────┐  │   │
│                │  │  │ Volume by Category   │  │ Volume by Dept      │  │   │
│                │  │  │                      │  │                     │  │   │
│                │  │  │  [bar/line chart]    │  │  [bar/line chart]   │  │   │
│                │  │  │                      │  │                     │  │   │
│                │  │  └──────────────────────┘  └─────────────────────┘  │   │
│                │  └──────────────────────────────────────────────────────┘   │
│                │                                                              │
│                │  ┌── Row 2: Status + Resolution ────────────────────────┐   │
│                │  │                                                      │   │
│                │  │  ┌──────────────────────┐  ┌─────────────────────┐  │   │
│                │  │  │ Open vs. Closed      │  │ Avg Resolution Time │  │   │
│                │  │  │                      │  │ by Category/Dept    │  │   │
│                │  │  │  [donut chart]       │  │ [horiz bar chart]   │  │   │
│                │  │  │  click segments      │  │                     │  │   │
│                │  │  │  → filter queue      │  │                     │  │   │
│                │  │  └──────────────────────┘  └─────────────────────┘  │   │
│                │  └──────────────────────────────────────────────────────┘   │
│                │                                                              │
│                │  ┌── Row 3: Geographic Density ─────────────────────────┐   │
│                │  │                                                      │   │
│                │  │  Status: [All ●] [Open] [Closed]                     │   │
│                │  │                                                      │   │
│                │  │  [LEAFLET MAP — density visualization]               │   │
│                │  │  Circle markers sized by count, or heatmap layer     │   │
│                │  │  (300px tall)                                        │   │
│                │  │                                                      │   │
│                │  └──────────────────────────────────────────────────────┘   │
└────────────────┴──────────────────────────────────────────────────────────────┘
```

---

## Layout — Mobile (< 768px)

Charts stack vertically:
1. Date range picker (sticky)
2. Volume by Category (full width)
3. Volume by Department (full width)
4. Open vs. Closed donut (full width)
5. Avg Resolution Time (full width)
6. Geographic density map (full width)
7. Export CSV button (bottom)

---

## Date Range Picker

```
┌─────────────────────────────────────────────────────────┐
│  [Last 7d]  [Last 30d]  [Last 90d]  [Custom ▾]          │
│                           ↓ Custom expanded:             │
│  From: [2026-06-01]   To: [2026-07-06]                  │
│  ⚠ Date range cannot exceed 366 days                    │
└─────────────────────────────────────────────────────────┘
```

---

## Chart Detail: Open vs. Closed Donut

```
┌──────────────────────────────────────────────────┐
│  Open vs. Closed                                 │
│                                                  │
│           ╭──────╮                               │
│      ╭────┤ 43%  ├────╮                          │
│      │    │  In  │    │                          │
│      │    │ Prog │    │   ■ Open:       123      │
│      │    ╰──────╯    │   ■ In Progress: 89      │
│      │                │   ■ Closed:     201      │
│      ╰────────────────╯   ■ Archived:    12      │
│                                                  │
│  Click a segment to view those tickets →         │
└──────────────────────────────────────────────────┘
```

Clicking a donut segment navigates to `/staff/tickets?status=[status]` with current date range.

---

## Export CSV

```
[Export CSV ↓] → GET /api/staff/reports/export?format=csv&start_date=...&end_date=...
```

- Browser triggers file download
- Filename: `ureport-export-2026-07-06.csv`
- If > 10,000 rows: amber notice "Export truncated to 10,000 rows" appears before download

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Volume by Category chart | Row 1 left |
| Primary | Volume by Department chart | Row 1 right |
| Primary | Date range picker | Sticky top |
| Secondary | Open vs. Closed donut | Row 2 left |
| Secondary | Average Resolution Time | Row 2 right |
| Secondary | Geographic density map | Row 3 |
| Tertiary | Export CSV | Date range bar right side |

---

## States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Loading | Skeleton charts (gray rectangles with pulse animation) | — |
| No data | "No tickets in this date range" empty state per chart | — |
| Date range error | Red inline message: "From date must be before To date" | `role="alert"` |
| Date range too wide | Warning: "Range cannot exceed 366 days" | `role="alert"` |
| Export loading | Button spinner "Exporting…" | — |
| Export truncated | Amber banner before download prompt | — |
| Chart hover | Tooltip with exact values | Standard chart tooltip |
| Donut segment click | Navigate to filtered queue | — |

---

## Chart Accessibility

- All charts have `aria-label` describing the data summary (e.g., "Bar chart showing ticket volume by category over the last 30 days")
- Chart data also available in tabular form (expandable "View as table" below each chart)
- Color-blind safe palette: blue, orange, teal, red, purple
- No information conveyed by color alone (pattern fills optional)
# Screen-08: Admin Panel Screens
## Routes: `/admin/**`  |  User Stories: US-6.1–US-6.6

**Purpose:** Configuration screens for categories, departments, substatuses, templates, users, and API keys.

---

## Admin Layout Shell

All admin screens share:

```
┌─────────────────┬────────────────────────────────────────────────────────┐
│  🏛 Admin       │  [Breadcrumb: Admin > Section Name]                     │
│  [admin badge]  ├────────────────────────────────────────────────────────│
│                 │  PAGE CONTENT                                           │
│  📂 Categories  │                                                         │
│  🏢 Departments │                                                         │
│  🏷 Substatuses │                                                         │
│  📝 Templates   │                                                         │
│  👥 Users       │                                                         │
│  🔑 API Keys    │                                                         │
│                 │                                                         │
│  ── Staff ──   │                                                         │
│  📋 Tickets     │                                                         │
│  👤 Account     │                                                         │
└─────────────────┴─────────────────────────────────────────────────────────┘
```

---

## Admin List Page Template (all admin sections follow this pattern)

```
┌────────────────────────────────────────────────────────────────┐
│  [Section Name]                             [+ Create New]     │
├────────────────────────────────────────────────────────────────┤
│  🔍 Search...                                                  │
├────────────────────────────────────────────────────────────────┤
│  Name            [Column 2]   [Column 3]  Status   Actions    │
├────────────────────────────────────────────────────────────────┤
│  Item A          ...          ...         ✅ Active  [Edit][⊘] │
│  Item B          ...          ...         ✅ Active  [Edit][⊘] │
│  Item C (dim)    ...          ...         ○ Inactive [Edit][↺] │
└────────────────────────────────────────────────────────────────┘
```

- Active items shown at full opacity; inactive items dimmed (50% opacity)
- Edit → opens drawer form on the right
- ⊘ Deactivate → confirmation dialog (warns if open tickets/linked records)
- ↺ Reactivate → immediate, no confirmation needed

---

## Admin Categories Screen (`/admin/categories`)

### Create/Edit Drawer

```
┌─────────────────────────────────────────────────────────┐  ←right side
│  New Category                                      [×]  │
├─────────────────────────────────────────────────────────┤
│  Name *                                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Holiday Light Removal Request                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Description                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Icon  [🔦 sparkles ▾]          Color  [#3B82F6 ■]     │
│                                                         │
│  Department *                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Public Works                                  ▾ │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Open311 service_code *                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │ HLREMOVAL                                       │   │
│  └─────────────────────────────────────────────────┘   │
│  e.g. POTHOLE — uppercase letters and underscores only  │  ← hint
│                                                         │
│  Anonymous allowed    [●─────]  (ON)                   │
│  Active               [●─────]  (ON)                   │
│                                                         │
│  ┌── Preview ──────────────────────────────────────┐   │
│  │  🔦 Holiday Light Removal Request               │   │  ← live preview
│  │  Routed to: Public Works                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Cancel]                              [Save Category]  │
└─────────────────────────────────────────────────────────┘
```

---

## Admin Substatuses Screen (`/admin/substatuses`)

```
┌────────────────────────────────────────────────────────────────┐
│  Substatuses                                    [+ Create New] │
├────────────────────────────────────────────────────────────────┤
│  ┌── Open ─────────────────────────────────────────────────┐  │
│  │  ⠿ Awaiting Triage        (active)  [Edit] [Deactivate] │  │  ← drag handle
│  │  ⠿ Needs Investigation    (active)  [Edit] [Deactivate] │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── In Progress ──────────────────────────────────────────┐  │
│  │  ⠿ Crew Scheduled         (active)  [Edit] [Deactivate] │  │
│  │  ⠿ Awaiting Parts         (active)  [Edit] [Deactivate] │  │
│  │  ⠿ Work Begun             (active)  [Edit] [Deactivate] │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌── Closed ───────────────────────────────────────────────┐  │
│  │  ⠿ Resolved - Confirmed   (active)  [Edit] [Deactivate] │  │
│  │  ⠿ Duplicate Report       (active)  [Edit] [Deactivate] │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

Drag-to-reorder within each group. Reorder sends `PATCH /api/admin/substatuses/reorder`.

---

## Admin Users Screen (`/admin/users`)

```
┌────────────────────────────────────────────────────────────────┐
│  User Accounts                             [+ Create Account]  │
├────────────────────────────────────────────────────────────────┤
│  Username       Email              Role    Dept     Status     │
├────────────────────────────────────────────────────────────────┤
│  d.kowalski     d.k@city.gov       Staff   Pub Wks  ✅ Active  │
│  r.osei         r.o@city.gov       Admin   —        ✅ Active  │
│  j.smith (dim)  j.s@city.gov       Staff   Parks    ○ Inactive │
└────────────────────────────────────────────────────────────────┘
```

**Create User Drawer fields:**
- Username (required, alphanumeric + _ -)
- Email (required, valid email)
- Initial Password (required, meets policy: ≥12 chars, uppercase, digit)
- Role: Staff / Admin (radio)
- Department (optional dropdown)

**Row actions:**
- Edit: change email, role, department (not username)
- Deactivate: `active = false`; sessions expire naturally
- Reset Password: opens dialog for new password entry, invalidates all sessions immediately
- Cannot deactivate own account: button disabled with tooltip "Cannot deactivate your own account"

---

## Admin API Keys Screen (`/admin/api-keys`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  API Keys                                          [+ Generate Key] │
├─────────────────────────────────────────────────────────────────────┤
│  Label                    Scope  Created      Last Used   Status    │
├─────────────────────────────────────────────────────────────────────┤
│  CivicTech — Liam Tran    write  Jul 1 2026   2h ago      ✅ Active │
│  BloApp Mobile            read   Mar 5 2026   1d ago      ✅ Active │
│  Old Integration (dim)    read   Jan 2025     Never       ⊘ Revoked │
└─────────────────────────────────────────────────────────────────────┘
```

**One-Time Key Display Modal** (shown immediately after Generate):

```
┌────────────────────────────────────────────────────────┐
│  ⚠ Copy your API key now                           [×] │
│  This key cannot be shown again.                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  a3f92b1c4e5d...8f2a1b9c0e3d  (64 chars)       │   │
│  └────────────────────────────────────────────────┘   │
│  [📋 Copy key]        ⏱ 30 seconds remaining          │
│                                                        │
│  [I've copied it — Close]                              │
└────────────────────────────────────────────────────────┘
```

- Key display area: `<input type="text" readonly>` for keyboard select/copy
- Countdown timer: visual urgency without blocking
- Closing modal without copying: confirmation: "Are you sure? The key cannot be shown again."

---

## Admin Response Templates Screen (`/admin/response-templates`)

**Create/Edit Drawer fields:**
- Name (required, unique among active)
- Category filter (optional — limits template to one category)
- Department filter (optional)
- Active toggle
- Body textarea (up to 10,000 chars) with:
  - Toolbar showing `{{ticket_id}}` `{{address}}` `{{category_name}}` insert buttons
  - Unknown `{{...}}` tokens highlighted in amber with tooltip: "Unknown placeholder — will not be substituted"

---

## Information Hierarchy (Admin Screens)

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Item list/table | Main content area |
| Primary | Create/Edit form (drawer) | Right-side drawer (420px) |
| Secondary | Search bar | Top of list |
| Secondary | Create button | Top right |
| Tertiary | Active/Inactive filter | Below search (optional toggle) |
| Tertiary | Breadcrumb | Page header |

---

## States (Common Admin)

| State | Appearance |
|-------|------------|
| Empty list | "No [items] yet. Create the first one." + CTA button |
| Create success | Toast: "[Item name] created successfully"; list refreshes |
| Save error | Field-level errors in drawer; drawer stays open |
| Deactivate with warnings | Warning count shown in confirm dialog |
| Conflict (duplicate) | Field error inline: "[field] already in use" |
# Y0: Interaction Patterns

---

## Pattern: Slide-up Sheet (Mobile Report Panel)

**When to use:** Overlaying a form or action panel over a map without navigating away (public portal report flow).

**Behavior:**
- Triggered by confirming a pin location on the map
- Sheet animates from bottom of viewport
- `height: 70vh` default; user can drag handle to expand to full screen
- Background map is dimmed (`backdrop: rgba(0,0,0,0.4)`) but still visible
- Swipe down to dismiss (confirm if dirty)
- `focus-trap` keeps Tab key within the sheet

**Examples:** Public report form (Screen-00, Screen-01)

---

## Pattern: Slide-in Drawer (Admin Create/Edit)

**When to use:** Admin panel create/edit forms for reference data. Preserves list context behind the form.

**Behavior:**
- Triggered by "+ Create" or "Edit" button
- Drawer animates in from the right
- Fixed width: 420px on desktop; full width on mobile (acts as full page)
- Background list is slightly dimmed; clicking outside drawer = confirm-close if dirty
- `Escape` key dismisses if form is clean; prompts if dirty
- Submit: spinner + disabled fields → toast on success → drawer closes

**Examples:** Category create/edit (Screen-08), Template edit

---

## Pattern: Confirmation Dialog

**When to use:** Destructive or significant state changes (status transitions, deactivation, merge, anonymize, revoke).

**Behavior:**
- Modal dialog, centered
- Title summarizes the action
- Body shows the impact ("X tickets will be affected")
- Two buttons: secondary [Cancel] (left) + primary or destructive [Confirm] (right)
- Destructive actions: confirm button is `variant="destructive"` (red)
- `Escape` = Cancel; `Enter` does NOT auto-confirm (prevents accidental confirmations)
- Loading state on confirm: spinner, button disabled, dialog stays open

**Examples:** Status change, deactivate category, revoke API key, anonymize person, merge persons

---

## Pattern: Toast Notifications

**When to use:** Non-blocking success, error, or informational feedback after an action completes.

**Behavior:**
- Appears bottom-right on desktop; bottom-center on mobile
- Auto-dismisses after 4 seconds; manual dismiss via × button
- Types: `default` (blue), `success` (green), `error` (red), `warning` (amber)
- Stacks if multiple toasts: newest on top, max 3 visible
- `role="status"` `aria-live="polite"` for success; `aria-live="assertive"` for errors

**Examples:** "Category saved — live in public portal", "5 tickets updated", "Link copied"

---

## Pattern: Inline Field Validation

**When to use:** Form fields with constraints (required, character limits, format validation).

**Behavior:**
- Validation triggers on blur (not on keystroke to avoid premature errors)
- Error state: red border on input, error message `<p>` below field with `id` referenced by `aria-describedby`
- Success state (optional for critical fields): subtle green check icon — not shown universally to avoid clutter
- Character counter: shown only on fields with meaningful limits (description, response body); turns red at 95% of max
- Submit attempt: all fields validate simultaneously; focus moves to first errored field

**Examples:** Description (10–4000 chars), service_code format, email format, password policy

---

## Pattern: Quick-View Popover (Queue Row Hover)

**When to use:** Staff ticket queue rows — show preview without navigation.

**Behavior:**
- Triggers on hover with 300ms delay (prevents accidental triggers while scanning)
- Appears as floating card beside the row
- Contains: ticket ID, address, description excerpt (first 120 chars), category, status, assignee, optional thumbnail
- "Open ticket →" link inside popover
- Keyboard accessible: `Tab` to row → `Enter` to navigate (no popover on keyboard focus to avoid noise)
- Touch: no hover popover; tap navigates directly

**Examples:** Staff ticket queue (Screen-04)

---

## Pattern: Optimistic UI Update

**When to use:** Status changes, assignment, response submission on ticket detail.

**Behavior:**
- UI updates immediately on user confirm (before server response)
- Loading indicator shown subtly (e.g., spinner in status badge)
- On server success: indicator clears; history timeline animates in new entry
- On server error: UI reverts to previous state; error toast shown
- Prevents the "lag of doubt" where Diane wonders if her action was registered

**Examples:** Status change (Screen-05), bulk action (Screen-04)

---

## Pattern: Sticky Filter / Control Bar

**When to use:** Any list page with filterable content (ticket queue, admin lists, reports).

**Behavior:**
- Filter bar `position: sticky; top: 0` (below the sidebar top rail on desktop)
- Stays visible when user scrolls through long lists
- Applied filters shown as removable chips ("Status: Open ×", "Dept: Public Works ×")
- "Clear all" link appears when any filter is active
- Filter state encoded in URL query params; back button restores filter state

**Examples:** Staff ticket queue (Screen-04), Reports date range (Screen-07)

---

## Pattern: Skeleton Loading

**When to use:** Any page or section that requires a server fetch before rendering.

**Behavior:**
- Show skeleton immediately on navigation/mount
- Skeleton matches approximate dimensions of the loaded content (avoids layout shift)
- Animated CSS pulse on skeleton elements (`animate-pulse`)
- Never show a spinner for more than ~1.5s without showing skeleton content structure

**Examples:** Ticket list rows, chart placeholders, history timeline, person list

---

## Pattern: Empty State

**When to use:** Lists or sections with no data (filtered to nothing, first-time use).

**Behavior:**
- Center-aligned illustration / icon (not decoration — conveys the "nothing here" state)
- 1–2 sentence explanation of why it's empty
- Primary action CTA if relevant ("Create your first category", "Clear filters")
- No raw "No results" text alone — always provide context

**Examples:** Empty ticket queue (no filters match), empty media gallery, no saved views, no people found

---

## Pattern: API Key One-Time Display

**When to use:** Generating an Open311 API key (only shown once at creation).

**Behavior:**
- Modal blocks all interaction
- Key displayed in `<input type="text" readonly>` (selectable, pasteable)
- Large "Copy" button (primary CTA) — changes to "Copied ✓" for 3s after click
- Countdown timer (30s) creates urgency without forcing action
- Closing the modal before copying: requires explicit confirmation ("Are you sure? The key cannot be retrieved.")
- Key is NEVER stored in plaintext after this modal is dismissed

**Examples:** Admin API Keys (Screen-08)

---

## Pattern: Breadcrumb Navigation

**When to use:** All staff and admin pages (not public portal).

**Behavior:**
- `<nav aria-label="Breadcrumb">` with `<ol>` structure
- Current page is the last item (not a link); all ancestor items are links
- On mobile: abbreviated to show only parent + current page
- Example: `Admin > Categories > Edit: Pothole`

**Examples:** All `/staff/**` and `/admin/**` pages
# Y1: Responsive Considerations

---

## Breakpoints

| Name | Range | Layout Mode |
|------|-------|-------------|
| Mobile | `< 768px` | Single column, bottom sheets, card rows |
| Tablet | `768px – 1024px` | Two-column, collapsible sidebar icon-only |
| Desktop | `> 1024px` | Three-panel layouts, persistent sidebar, hover affordances |

Tailwind config: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`

---

## Public Portal

### Mobile (Priority)
- Map fills full viewport height minus 56px top bar
- Address search: floating card at top of map, full-width, 44px height
- Report panel: bottom sheet (70vh, draggable to full height)
- Step form: single column, large tap targets (≥44px all interactive elements)
- Progress indicator: dots only (no text labels on mobile)
- Submit button: full-width, 56px height

### Tablet
- Map fills left 60% of screen; report panel is a fixed right column (40% width)
- No bottom sheet needed — panel is always visible alongside map

### Desktop
- Map fills full viewport; report panel is a 420px fixed right panel (same as tablet pattern)
- Hover affordances on map (cursor crosshair in pin-placement mode)

---

## Staff Ticket Queue

### Mobile
- Sidebar collapsed to hamburger menu (drawer overlay on open)
- Ticket rows become stacked cards (not table rows) — card shows: ID, category icon, status badge, address, time
- Filter panel: triggered by filter icon → full-height drawer overlay
- Bulk action bar: sticks to bottom, full width
- Map view: full width (no sidebar)
- Saved views: accessible from sidebar drawer

### Tablet
- Sidebar: icon-only (48px wide) with tooltips
- Ticket list: table with fewer columns (ID, category, status, date — omit dept, assignee)
- Filter panel: collapsible inline (not drawer)

### Desktop
- Full three-column layout: sidebar + main content + filter panel (when expanded)
- All columns visible; hover popover works

---

## Staff Ticket Detail

### Mobile
- All sections stack vertically
- Non-critical sections (map, related tickets) collapsed into `<details>` accordions
- Status and assignee controls: full-width dropdowns
- Response composer: full-width textarea
- History timeline: scrollable, default showing last 5 entries with "Show all" link
- Media gallery: 2-column grid
- Template picker: full-screen overlay (not dropdown)

### Tablet
- Two-column: left column (map + status/assignee controls), right column (history + response)
- Media gallery: 3-column grid

### Desktop
- Three-panel feel: header spans full width; below is left (map+controls) + right (history+response)
- Media gallery: 4-column grid with thumbnails

---

## Admin Panels

### Mobile
- Sidebar collapsed to hamburger
- List pages: card rows instead of table (name + status + action buttons stacked)
- Create/Edit drawer: full-width overlay (acts as a page)
- API key modal: full-screen on mobile

### Tablet
- Sidebar icon-only
- Table with key columns; other columns hidden or in row expansion

### Desktop
- Full table with all columns
- Drawer is 420px right panel alongside list

---

## Reports Dashboard

### Mobile
- Charts stacked vertically, each full-width
- Date range picker: dropdown with preset chips
- Donut chart: legend below (not beside) the chart
- Geographic map: 250px tall; tap markers for popups

### Tablet / Desktop
- 2-column grid for charts (Row 1: volume charts; Row 2: status + resolution)
- Geographic map: full width, 350px tall

---

## Touch Considerations (Mobile / Tablet)

| Element | Desktop Behavior | Mobile Behavior |
|---------|-----------------|-----------------|
| Row hover popover | Shows on 300ms hover | Not shown; tap = navigate |
| Drag-to-reorder (substatuses) | Mouse drag | Touch drag (touch-action: none) |
| Map pin placement | Click | Tap; long-press also works |
| Map pan | Click+drag | Single-finger swipe |
| Map zoom | Scroll wheel or +/- buttons | Pinch gesture or +/- buttons |
| Dropdown menus | Hover to preview | Tap to open; tap outside to close |
| Tooltip | Hover | Long-press (300ms) |
| Chart hover tooltips | Hover over data point | Tap data point |

---

## Performance Targets

| Surface | Target | Method |
|---------|--------|--------|
| Public portal LCP | < 2.5s on 4G | Map skeleton immediately; defer tile fetch; code-split Leaflet |
| Staff queue initial load | < 2s on desktop | Server-side render list; client hydration |
| Admin panel | < 1.5s | Static-ish pages; small data fetches |
| Chart data fetch | < 2s per chart | Parallel fetch; skeleton while loading |
| Map tile rendering | Non-blocking | Tiles load progressively; app usable before all tiles loaded |
# Y2: Accessibility Notes
## WCAG 2.1 AA — uReport NG

---

## Color Contrast

| Element | Foreground | Background | Ratio | Passes AA |
|---------|------------|------------|-------|-----------|
| Body text | Slate-900 `#0f172a` | White `#ffffff` | 19.1:1 | ✅ |
| Body text (dark mode) | Slate-100 `#f1f5f9` | Slate-900 `#0f172a` | 19.1:1 | ✅ |
| Muted text (hints, labels) | Slate-500 `#64748b` | White | 4.6:1 | ✅ |
| Primary button text | White | Slate-600 `#475569` | 5.9:1 | ✅ |
| Error text | Red-700 `#b91c1c` | White | 5.9:1 | ✅ |
| Status badge "Open" | Blue-800 `#1e40af` | Blue-100 `#dbeafe` | 7.2:1 | ✅ |
| Status badge "In Progress" | Amber-800 `#92400e` | Amber-100 `#fef3c7` | 6.8:1 | ✅ |
| Status badge "Closed" | Green-800 `#166534` | Green-100 `#dcfce7` | 7.4:1 | ✅ |

*Note: All city-configurable `--color-primary` values must be validated against white text at ≥ 4.5:1. Provide a contrast checker in the admin color picker.*

---

## Keyboard Navigation

### All Pages
- `Tab` / `Shift+Tab` — traverse interactive elements in DOM order
- `Enter` / `Space` — activate buttons and links
- `Escape` — dismiss modals, drawers, dropdowns, popovers
- Skip-to-content link: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>` — first focusable element on every page

### Map (Leaflet)
- `+` / `-` keys: zoom in/out (Leaflet default)
- Arrow keys: pan map
- `Enter` on map: place pin at viewport center (custom keyboard handler)
- `Tab` to cycle through existing markers
- `Enter` on marker: open popup
- Map container: `role="application"` `aria-label="City issue reporting map. Use keyboard to navigate: arrow keys to pan, + and - to zoom, Enter to place a pin."` 
- Map controls (zoom buttons): standard `<button>` elements with `aria-label="Zoom in"` / `"Zoom out"`

### Dropdown/Select Components
- shadcn/ui `<Select>`: WAI-ARIA combobox pattern
- Arrow keys navigate options
- `Enter` selects; `Escape` closes
- Type-ahead search in dropdowns with ≥10 items

### Dialog/Modal
- On open: focus moves to first interactive element (or close button)
- `focus-trap` — Tab cycles only within the modal
- `Escape` closes if non-destructive; prompts if action in progress
- On close: focus returns to the element that triggered the dialog

### Table (Ticket Queue)
- `<table>` with `<thead>` `<th scope="col">` for all column headers
- Row checkboxes: `<input type="checkbox">` with `aria-label="Select ticket [ID]"`
- Header checkbox: `aria-label="Select all tickets on this page"` with `aria-checked="mixed"` when partially selected
- Sortable columns: `aria-sort="ascending"` / `"descending"` / `"none"` on `<th>` elements

### Form Validation
- Error messages linked to their field via `aria-describedby`
- `aria-invalid="true"` on invalid fields
- Error summary at top of form on submit with failed field count (for long forms)
- `aria-required="true"` on required fields (in addition to visual asterisk)

---

## Screen Reader Considerations

### Status Updates (Live Regions)
- `aria-live="polite"` `aria-atomic="true"` on:
  - Toast container (success notifications)
  - Pin-placement address confirmation
  - Queue filter results count ("Showing 14 tickets")
  - Bulk action result ("5 tickets updated")
- `aria-live="assertive"` on:
  - Error toasts
  - Out-of-bounds map warning
  - Session expiry warning

### Dynamic Content
- Ticket history timeline: new entries appended use `aria-live="polite"` region; existing entries are static
- Template insertion into textarea: focus moved to textarea after insertion; `aria-label` updated to include "Template inserted"
- Confirmation dialog open/close: `aria-modal="true"` on dialog; background content `aria-hidden="true"` when dialog open

### Images and Icons
- Decorative icons (lucide): `aria-hidden="true"`
- Informational icons (status dots, category icons): `aria-label` on containing element
- User-uploaded photo thumbnails: `alt="Photo [N] attached to ticket [ID]"`
- Map markers: `aria-label="[Category]: [Status] at [Address]. Press Enter to view details."`

### Charts (Reports Dashboard)
- Each chart has `role="img"` `aria-label` describing the data summary
- Expandable data table below each chart: `<table>` with the same data in tabular form
- Example: `aria-label="Bar chart: Ticket volume by category, Jul 1–7. Pothole: 23, Graffiti: 8, Street Light: 5."`

---

## ARIA Patterns by Component

| Component | ARIA Role | Key Attributes |
|-----------|-----------|----------------|
| Public map | `application` | `aria-label` (descriptive), `aria-roledescription="map"` |
| Map marker | `button` (custom) | `aria-label="[Category] at [Address], [Status]"` |
| Marker cluster | `button` | `aria-label="[N] issues in this area. Press Enter to zoom in."` |
| Status badge | `<span>` | `aria-label="Status: [status name]"` (badge color has text fallback) |
| Loading skeleton | `<div>` | `aria-hidden="true"` (decorative); `aria-busy="true"` on parent |
| Quick-view popover | `tooltip` | `aria-describedby` on trigger row |
| File drop zone | `button` | `aria-label="Upload photos. Press Enter to open file picker. Drag and drop also supported."` |
| Progress stepper | `<ol>` | `aria-label="Report submission steps"`, current step `aria-current="step"` |
| Timeline | `<ol>` | `aria-label="Ticket history"` |
| Bulk action bar | `<region>` | `aria-label="Bulk actions for selected tickets"` `aria-live="polite"` |
| Admin drawer | `dialog` | `aria-modal="true"` `aria-labelledby` pointing to drawer title |

---

## Focus Management

| Trigger | Focus Destination |
|---------|------------------|
| Open report panel (confirm pin) | First field in report panel (Category select) |
| Close report panel | Map canvas (or confirm-location strip button) |
| Open dialog | First focusable element in dialog |
| Close dialog | Element that triggered the dialog |
| Open admin drawer | First form field in drawer |
| Close admin drawer | "Create" / "Edit" button that triggered it |
| Form submit error | First errored field |
| Toast appears | Toast is `aria-live`; focus stays on current element |
| Navigate to ticket detail | `<h1>` with ticket ID |
| Template inserted into textarea | Textarea (with cursor at first placeholder or end) |

---

## Testing Checklist

| Test | Tool | Criteria |
|------|------|----------|
| Color contrast | axe-core in Playwright e2e | Zero AA contrast violations |
| Keyboard navigation | Manual + Playwright | All interactive elements reachable; no keyboard traps |
| Screen reader | NVDA (Windows), VoiceOver (iOS/macOS) | All content readable; live regions fire correctly |
| Focus indicators | Visual inspection + axe | Focus ring visible on all focused elements in both themes |
| Lighthouse Accessibility | Lighthouse CI | Score ≥ 90 on public portal and staff queue |
| axe automated scan | axe-core Playwright plugin | Zero P1/P2 violations at deploy |
