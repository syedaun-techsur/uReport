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
