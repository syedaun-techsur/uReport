# Flow-00: Public Issue Reporting
## JRN-01.1 — Marcus Webb reports a pothole anonymously on mobile

**Trigger:** Constituent navigates to `/` (city website link, search result, or direct URL)  
**User Stories:** US-0.1, US-0.2, US-0.3, US-0.4, US-0.5, US-0.6  
**Persona:** Marcus Webb (PER-01)  
**Device:** Mobile-first (Android Chrome, iOS Safari 16+)  

---

## Flow Diagram

```
[User opens / on mobile]
         │
         ▼
[Map loads — centered on city, zoom 13]
  "Tap map to place pin" tooltip shown
         │
         ├── Map renders < 3s ──▶ [Pin placement mode]
         │
         └── Map fails / > 3s ──▶ [Skeleton + "Loading map..." fallback]
                                          │
                                          ▼
                                   [Show address-only entry mode]

[Pin placement mode]
         │
         ├── User taps/clicks map ──▶ [Draggable pin placed]
         │                                    │
         │                                    ▼
         │                         [Reverse geocode → address populated]
         │                                    │
         │                         [Pin inside bbox?]
         │                                    │
         │                         ├── Yes → no warning
         │                         └── No  → amber warning banner
         │                                    (submission not blocked)
         │
         └── User types address ──▶ [Debounced 300ms → Nominatim]
                  │                         │
                  ▼                         ▼
           [Address dropdown          [Up to 5 candidates shown]
            ≥3 chars trigger]                │
                                     [User selects candidate]
                                             │
                                             ▼
                                    [Pin placed at lat/lng]
                                    [Address field populated]

[Location confirmed → Slide-up report panel opens]
         │
         ▼
[Step 1: Category selection]
  • Dropdown of active categories (GET /api/categories)
  • Department name shown below selector
  • anon_allowed status determines contact field visibility
         │
         ▼
[Step 2: Description]
  • Free text, 10–4000 chars
  • Live character count
  • Inline validation on blur
         │
         ▼
[Step 3: Photo upload (optional)]
  • Drag-and-drop or tap to browse
  • Up to 5 files, ≤10MB each
  • image/* or application/pdf
  • File thumbnails shown after selection
         │
         ▼
[Step 4: Contact info]
  ├── anon_allowed=true:
  │     "Leave blank to submit anonymously" label
  │     name/email/phone all optional
  │
  └── anon_allowed=false:
        name required, email required
        "Contact required for this category" notice
         │
         ▼
[Submit button]
  • Client validates all required fields
  • If validation errors → inline errors shown, no submit
         │
         ├── POST /api/tickets → 201 ──▶ [Navigate to /tickets/[id]/confirm]
         │
         ├── POST /api/tickets → 422 ──▶ [Inline field errors displayed]
         │                               [Form stays open, user corrects]
         │
         └── POST /api/tickets → 500 ──▶ [Error card: "Submission failed"]
                                          ["Try again" button + "Save draft" option]
                                          [Spinner stops]
```

---

## Step Details

### Step 0: Map Load
- **Entry point:** `/`
- **Behavior:** Leaflet dynamically imported (`{ ssr: false }`). Map skeleton shown immediately. Tiles load progressively.
- **Tooltip:** First-time hint "Tap the map to mark the issue location" (dismissible, stored in sessionStorage)
- **Fallback:** If map fails, address-only mode shown with geocoder still available

### Step 1: Pin Placement
- **Tap/click:** Places draggable marker pin (primary color, drop animation)
- **Drag:** Pin can be repositioned; address updates on drag end
- **Confirm strip:** Small bottom strip shows "📍 [Address]  ✓ Looks right?" with [Change] and [Confirm] buttons (44px min height)
- **Keyboard:** Arrow keys move map viewport; Enter places pin at center

### Step 2: Report Panel (Slide-up Sheet)
- **Mobile:** Sheet slides up from bottom (≥60% viewport height)
- **Desktop:** Side panel slides in from right (400px wide)
- **Header:** "Report an Issue" + progress steps indicator (1–4)
- **Close:** × button, swipe-down on mobile; confirmation dialog if data entered

### Step 3: Category
- **UI:** shadcn/ui `<Select>` with category icon + name
- **Department hint:** `<p class="text-sm text-muted-foreground">Routed to: [Dept Name]</p>` below selector
- **Anonymous notice:** Conditional banner below department hint

### Step 4: Description
- **UI:** `<Textarea>` with min 3 rows, max 8 rows
- **Counter:** `[chars]/4000` shown bottom-right, turns red at >3800
- **Validation:** Error shown on blur if < 10 chars

### Step 5: Photo Upload
- **UI:** Drop zone card with camera icon, "Tap to add photos"
- **After upload:** Thumbnail grid (2×N) with × remove button per file
- **Errors:** MIME invalid / too large shown inline per file

### Step 6: Contact
- **Conditional:** Only shown after category selection
- **Layout:** name, email, phone in single-column stack
- **Labels:** Each field has visible label + `aria-required` where applicable

### Step 7: Submit
- **Button state:** Disabled until required fields valid; enabled state is primary color
- **Loading:** Spinner inside button; button text → "Submitting…"; form fields disabled
- **Success:** Navigate to confirmation page
- **Network error:** Toast + "Try again" button; form re-enabled

---

## Exit Points

| Exit | Condition | Destination |
|------|-----------|-------------|
| Success | HTTP 201 from POST /api/tickets | `/tickets/[id]/confirm` |
| User closes panel | Tap ×, swipe down | Back to map (no data loss if fields filled — warn) |
| Navigates away | Browser back | Confirm dialog if form dirty |
