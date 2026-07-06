# Screen-06: Staff People (CRM)
## Routes: `/staff/people` and `/staff/people/[id]`
## User Stories: US-5.1, US-5.2, US-5.3, US-5.4, US-5.5

**Purpose:** Staff-only CRM for searching, viewing, linking, merging, and anonymizing constituent records.

---

## Screen: People Search (`/staff/people`)

### Layout — Desktop

```
┌────────────────┬────────────────────────────────────────────────────┐
│  sidebar       │  People Search                                      │
│                ├─────────────────────────────────────────────────────│
│                │  ┌──────────────────────────────────────────────┐  │
│                │  │ 🔍 Search by name, email, or phone...         │  │
│                │  └──────────────────────────────────────────────┘  │
│                │                                                     │
│                │  ┌─────────────────────────────────────────────┐   │
│                │  │ Name            Email         Tickets  Last  │   │
│                │  ├─────────────────────────────────────────────┤   │
│                │  │ Marcus Webb     m.w@email.com    3     2h ago│   │
│                │  ├─────────────────────────────────────────────┤   │
│                │  │ Anonymous       —               1     3d ago │   │  ← anonymized
│                │  ├─────────────────────────────────────────────┤   │
│                │  │ Sarah Chen      s.c@email.com    7     1w ago│   │
│                │  └─────────────────────────────────────────────┘   │
│                │  Showing 3 of 47 results                            │
└────────────────┴─────────────────────────────────────────────────────┘
```

### States

| State | Appearance |
|-------|------------|
| Empty search | "Enter at least 2 characters to search" placeholder |
| Loading | Skeleton rows |
| No results | "No matching contacts found. Check spelling or try a different term." |
| Anonymized person | Row shows "Anonymous Constituent" — no email/phone |
| Results | Paginated list, click row → person detail |

---

## Screen: Person Detail (`/staff/people/[id]`)

### Layout — Desktop

```
┌────────────────┬────────────────────────────────────────────────────────┐
│  sidebar       │  ← People                                               │
│                ├────────────────────────────────────────────────────────│
│                │  👤 Marcus Webb                          [⋮ Actions ▾] │
│                │                                                         │
│                │  ┌── Contact Info ──────────────────────────────────┐  │
│                │  │  ✉ m.webb@email.com                              │  │
│                │  │  📱 555-0198                                      │  │
│                │  │  Preferred: Email                                 │  │
│                │  │  Notes: Regular reporter in north district        │  │
│                │  └──────────────────────────────────────────────────┘  │
│                │                                                         │
│                │  ┌── Linked Tickets (3) ───────────────────────────┐   │
│                │  │ BRK-2847 · Pothole · In Progress · Jul 3 2026   │   │
│                │  │ BRK-2831 · Graffiti · Closed · Jun 20 2026      │   │
│                │  │ BRK-2805 · Pothole · Closed · Jun 1 2026        │   │
│                │  └──────────────────────────────────────────────────┘  │
│                │                                                         │
│                │  Actions (via [⋮] menu):                               │
│                │  • Merge with…                                          │
│                │  • Anonymize Record (destructive)                       │
└────────────────┴────────────────────────────────────────────────────────┘
```

---

## Merge Dialog

Opened from "Merge with…" action:

```
┌────────────────────────────────────────────────┐
│  Merge with Another Contact                [×] │
│                                                │
│  SOURCE (will be removed):                     │
│  Marcus Webb · m.webb@email.com · 3 tickets    │
│                                                │
│  TARGET (canonical — will be kept):            │
│  🔍 Search for the canonical contact...        │
│  ┌────────────────────────────────────────┐   │
│  │ M. Webb   m.webb2@email.com  1 ticket  │   │  ← search result
│  └────────────────────────────────────────┘   │
│                                                │
│  ⚠ All 3 tickets will be linked to the target  │
│  record. The source will be removed.           │
│                                                │
│  [Cancel]               [Merge Records]        │
└────────────────────────────────────────────────┘
```

---

## Anonymize Confirmation Dialog

```
┌────────────────────────────────────────────────┐
│  Anonymize Record                          [×] │
│                                                │
│  ⚠ This action is PERMANENT and cannot be     │
│  undone.                                       │
│                                                │
│  All personal information will be removed:     │
│  • Name, email, phone, notes                  │
│  • Will display as "Anonymous Constituent"    │
│                                                │
│  Linked tickets (3) will NOT be deleted.       │
│                                                │
│  [Cancel]               [Anonymize]            │  ← destructive = red
└────────────────────────────────────────────────┘
```

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Contact info (name, email, phone) | Top card |
| Primary | Linked tickets list | Second card |
| Secondary | Notes / preferred contact | Inside contact card |
| Secondary | Actions menu | Top right |
| Tertiary | Merge / anonymize (destructive) | Actions dropdown |

---

## States

| State | Appearance |
|-------|------------|
| Anonymized person | All PII replaced with "—"; banner: "This record has been anonymized" |
| Merge loading | Spinner on confirm button |
| Merge success | Toast: "[N] tickets relinked"; source record removed from search |
| Anonymize success | All PII cleared; banner shown; action menu removes "Anonymize" option |
| Already anonymized | "Anonymize" option grayed out with tooltip "Already anonymized" |
