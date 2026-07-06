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
