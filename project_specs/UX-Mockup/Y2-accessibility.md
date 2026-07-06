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
