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
