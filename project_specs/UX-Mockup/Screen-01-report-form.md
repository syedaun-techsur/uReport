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
