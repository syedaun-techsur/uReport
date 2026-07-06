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
