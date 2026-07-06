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
