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
