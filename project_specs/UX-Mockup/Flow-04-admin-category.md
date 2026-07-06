# Flow-04: Admin Category Management
## JRN-03.1 — Renata creates a new service category without a code deployment

**Trigger:** Admin needs to add a new seasonal service category  
**User Stories:** US-6.1, US-6.2, US-6.3, US-6.4, US-6.5, US-6.6  
**Persona:** Renata Osei (PER-03)  
**Device:** Desktop  

---

## Flow Diagram

```
[Renata logs in as admin → navigates to /admin/categories]
         │
         ▼
[Admin Categories list page]
  Categories grouped by CategoryGroup, sorted by name
  Both active and inactive shown (inactive dimmed)
  Search bar at top, "+ New Category" button
         │
         ├── Click "+ New Category" ──▶ [Drawer slides in from right]
         │
         └── Click existing category row ──▶ [Edit drawer opens with pre-filled data]

[Create/Edit Category Drawer]
  Form fields:
  • Name (required, unique among active)
  • Description (optional textarea)
  • Icon (lucide icon picker with preview)
  • Color (#RRGGBB hex input with color swatch preview)
  • Department (dropdown of active departments only)
  • Anonymous allowed (toggle)
  • Active (toggle)
  • Open311 service_code (text input with inline format hint)
         │
         ▼
[Live preview pane]
  Shows how category card appears in constituent portal
  Updates as user types name, selects icon/color
         │
         ▼
[Validation on blur / submit]
  • service_code: uniqueness checked via API on blur
  • color: regex #RRGGBB validated
  • department_id: must be active
         │
         ├── POST/PATCH /api/admin/categories ──▶ Success:
         │                                         [Drawer closes]
         │                                         [Toast: "Category saved — live in public portal"]
         │                                         ["View in public portal →" shortcut link in toast]
         │                                         [List refreshes]
         │
         ├── Duplicate service_code ──▶ [Field error: "service_code already in use"]
         │
         └── Inactive department ──▶ [Field error: "Selected department is inactive"]

[Deactivate a category]
  User clicks "Deactivate" on a category row
         │
         ▼
[Warning dialog]
  "This category has [N] open tickets. Staff can still manage them."
  [Deactivate anyway]  [Cancel]
         │
         ▼
[Category marked inactive, dimmed in list]
[No longer appears in constituent portal category picker]

[Verify in public portal]
  Renata opens public portal in second tab
  New category appears in dropdown within 60 seconds
  No pod restart required
```

---

## API Key Management Flow (US-6.6 / JRN-03.2)

```
[Renata navigates to /admin/api-keys]
         │
         ▼
[API Keys list]
  Columns: Label, Scope, Created, Last Used, Status
  Active keys: normal; Revoked keys: strikethrough, dimmed
  "+ Generate Key" button (top right)
         │
         ├── Click "+ Generate Key"
         │         │
         │         ▼
         │   [Generate Key dialog]
         │   • Label (required, unique among active)
         │   • Scope: read / write radio
         │   [Generate]
         │         │
         │         ▼
         │   [Key display modal — ONE TIME ONLY]
         │   ┌────────────────────────────────────────┐
         │   │  ⚠ Copy this key now                   │
         │   │  It cannot be shown again               │
         │   │                                         │
         │   │  [•••••••••••••••••••••••••••••••••]   │
         │   │  [Copy key]   countdown: 30s            │
         │   │                                         │
         │   │  [I've copied it — Close]               │
         │   └────────────────────────────────────────┘
         │         │
         │   [Key stored as SHA-256 hash only]
         │   [Plain text never stored]
         │
         └── Click "Revoke" on active key
                   │
                   ▼
           [Confirmation dialog]
           "Revoke [Label]? All subsequent requests will return 401."
           [Revoke]  [Cancel]
                   │
                   ▼
           [PATCH /api/admin/api-keys/[id] with revoked_at]
           [Toast: "Key revoked — all subsequent requests return 401"]
           [Key row shows "Revoked" status immediately]
```

---

## Admin Panel Navigation Structure

```
/admin
  ├── /categories      → Service categories + CategoryGroups
  ├── /departments     → Department management
  ├── /substatuses     → Custom substatuses per status bucket
  ├── /response-templates → Canned response templates
  ├── /users           → Staff user accounts
  └── /api-keys        → Open311 API key management
```

Each admin list page follows the same pattern:
- Search bar (top)
- "+ Create" button (top right)
- Table/list with sortable columns
- Row actions: Edit (drawer), Deactivate/Reactivate
- Breadcrumb: Admin > [Section Name]
