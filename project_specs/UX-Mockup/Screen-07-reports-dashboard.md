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
