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
