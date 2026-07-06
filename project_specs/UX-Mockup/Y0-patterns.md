# Y0: Interaction Patterns

---

## Pattern: Slide-up Sheet (Mobile Report Panel)

**When to use:** Overlaying a form or action panel over a map without navigating away (public portal report flow).

**Behavior:**
- Triggered by confirming a pin location on the map
- Sheet animates from bottom of viewport
- `height: 70vh` default; user can drag handle to expand to full screen
- Background map is dimmed (`backdrop: rgba(0,0,0,0.4)`) but still visible
- Swipe down to dismiss (confirm if dirty)
- `focus-trap` keeps Tab key within the sheet

**Examples:** Public report form (Screen-00, Screen-01)

---

## Pattern: Slide-in Drawer (Admin Create/Edit)

**When to use:** Admin panel create/edit forms for reference data. Preserves list context behind the form.

**Behavior:**
- Triggered by "+ Create" or "Edit" button
- Drawer animates in from the right
- Fixed width: 420px on desktop; full width on mobile (acts as full page)
- Background list is slightly dimmed; clicking outside drawer = confirm-close if dirty
- `Escape` key dismisses if form is clean; prompts if dirty
- Submit: spinner + disabled fields → toast on success → drawer closes

**Examples:** Category create/edit (Screen-08), Template edit

---

## Pattern: Confirmation Dialog

**When to use:** Destructive or significant state changes (status transitions, deactivation, merge, anonymize, revoke).

**Behavior:**
- Modal dialog, centered
- Title summarizes the action
- Body shows the impact ("X tickets will be affected")
- Two buttons: secondary [Cancel] (left) + primary or destructive [Confirm] (right)
- Destructive actions: confirm button is `variant="destructive"` (red)
- `Escape` = Cancel; `Enter` does NOT auto-confirm (prevents accidental confirmations)
- Loading state on confirm: spinner, button disabled, dialog stays open

**Examples:** Status change, deactivate category, revoke API key, anonymize person, merge persons

---

## Pattern: Toast Notifications

**When to use:** Non-blocking success, error, or informational feedback after an action completes.

**Behavior:**
- Appears bottom-right on desktop; bottom-center on mobile
- Auto-dismisses after 4 seconds; manual dismiss via × button
- Types: `default` (blue), `success` (green), `error` (red), `warning` (amber)
- Stacks if multiple toasts: newest on top, max 3 visible
- `role="status"` `aria-live="polite"` for success; `aria-live="assertive"` for errors

**Examples:** "Category saved — live in public portal", "5 tickets updated", "Link copied"

---

## Pattern: Inline Field Validation

**When to use:** Form fields with constraints (required, character limits, format validation).

**Behavior:**
- Validation triggers on blur (not on keystroke to avoid premature errors)
- Error state: red border on input, error message `<p>` below field with `id` referenced by `aria-describedby`
- Success state (optional for critical fields): subtle green check icon — not shown universally to avoid clutter
- Character counter: shown only on fields with meaningful limits (description, response body); turns red at 95% of max
- Submit attempt: all fields validate simultaneously; focus moves to first errored field

**Examples:** Description (10–4000 chars), service_code format, email format, password policy

---

## Pattern: Quick-View Popover (Queue Row Hover)

**When to use:** Staff ticket queue rows — show preview without navigation.

**Behavior:**
- Triggers on hover with 300ms delay (prevents accidental triggers while scanning)
- Appears as floating card beside the row
- Contains: ticket ID, address, description excerpt (first 120 chars), category, status, assignee, optional thumbnail
- "Open ticket →" link inside popover
- Keyboard accessible: `Tab` to row → `Enter` to navigate (no popover on keyboard focus to avoid noise)
- Touch: no hover popover; tap navigates directly

**Examples:** Staff ticket queue (Screen-04)

---

## Pattern: Optimistic UI Update

**When to use:** Status changes, assignment, response submission on ticket detail.

**Behavior:**
- UI updates immediately on user confirm (before server response)
- Loading indicator shown subtly (e.g., spinner in status badge)
- On server success: indicator clears; history timeline animates in new entry
- On server error: UI reverts to previous state; error toast shown
- Prevents the "lag of doubt" where Diane wonders if her action was registered

**Examples:** Status change (Screen-05), bulk action (Screen-04)

---

## Pattern: Sticky Filter / Control Bar

**When to use:** Any list page with filterable content (ticket queue, admin lists, reports).

**Behavior:**
- Filter bar `position: sticky; top: 0` (below the sidebar top rail on desktop)
- Stays visible when user scrolls through long lists
- Applied filters shown as removable chips ("Status: Open ×", "Dept: Public Works ×")
- "Clear all" link appears when any filter is active
- Filter state encoded in URL query params; back button restores filter state

**Examples:** Staff ticket queue (Screen-04), Reports date range (Screen-07)

---

## Pattern: Skeleton Loading

**When to use:** Any page or section that requires a server fetch before rendering.

**Behavior:**
- Show skeleton immediately on navigation/mount
- Skeleton matches approximate dimensions of the loaded content (avoids layout shift)
- Animated CSS pulse on skeleton elements (`animate-pulse`)
- Never show a spinner for more than ~1.5s without showing skeleton content structure

**Examples:** Ticket list rows, chart placeholders, history timeline, person list

---

## Pattern: Empty State

**When to use:** Lists or sections with no data (filtered to nothing, first-time use).

**Behavior:**
- Center-aligned illustration / icon (not decoration — conveys the "nothing here" state)
- 1–2 sentence explanation of why it's empty
- Primary action CTA if relevant ("Create your first category", "Clear filters")
- No raw "No results" text alone — always provide context

**Examples:** Empty ticket queue (no filters match), empty media gallery, no saved views, no people found

---

## Pattern: API Key One-Time Display

**When to use:** Generating an Open311 API key (only shown once at creation).

**Behavior:**
- Modal blocks all interaction
- Key displayed in `<input type="text" readonly>` (selectable, pasteable)
- Large "Copy" button (primary CTA) — changes to "Copied ✓" for 3s after click
- Countdown timer (30s) creates urgency without forcing action
- Closing the modal before copying: requires explicit confirmation ("Are you sure? The key cannot be retrieved.")
- Key is NEVER stored in plaintext after this modal is dismissed

**Examples:** Admin API Keys (Screen-08)

---

## Pattern: Breadcrumb Navigation

**When to use:** All staff and admin pages (not public portal).

**Behavior:**
- `<nav aria-label="Breadcrumb">` with `<ol>` structure
- Current page is the last item (not a link); all ancestor items are links
- On mobile: abbreviated to show only parent + current page
- Example: `Admin > Categories > Edit: Pothole`

**Examples:** All `/staff/**` and `/admin/**` pages
