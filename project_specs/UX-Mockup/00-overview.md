# UX Mockup — uReport NG
## City of Bloomington Municipal 311/CRM

**Project:** uReport NG  
**Generated:** 2026-07-06  
**Based on:** UserStories-uReportNG.md, PRD-uReportNG.md, FRD-uReportNG.md, JOURNEYS-uReportNG.md  

---

## Overview

uReport NG is a map-first municipal 311 platform serving three distinct audiences on three distinct surfaces:

1. **Public Portal** (`/`) — Mobile-first, anonymous-friendly reporting flow. Hero experience. Map dominates.
2. **Staff Console** (`/staff/**`) — Ticket queue with filters, saved views, detail workspace. Desktop-primary with mobile support.
3. **Admin Panel** (`/admin/**`) — Configuration screens for reference data and system management.

---

## Design Principles

### 1. Map First
The Leaflet/OpenStreetMap map is the entry point — not a sidebar or afterthought. On the public portal the map is the hero; on the staff queue it is a toggle mode; on ticket detail it is a mini-map in the header.

### 2. Card-Based Layout, Sidebar Navigation
Content lives in rounded shadcn/ui Cards with subtle shadows. Navigation lives in a persistent left sidebar (collapsed to icon-only on mobile). Sticky filter bar on all list pages.

### 3. Progressive Disclosure
Public portal: collect location first, then category, then description, then contact. Never show a long form up front. Staff console: queue row shows minimal info; popover on hover shows more; click opens full detail.

### 4. Generous Spacing, AA Contrast
All interactive targets ≥ 44px tall. Body text contrast ≥ 4.5:1. Tailwind `space-y-6` / `gap-6` as base rhythm. Rounded cards (`rounded-xl`), subtle shadows (`shadow-sm`).

### 5. Light / Dark with System Default
shadcn/ui theming via CSS variables. `@media (prefers-color-scheme: dark)` as default. Municipal-neutral palette: slate primary, configurable brand accent (`--color-primary`).

### 6. Fully Responsive
Three breakpoints:
- **Mobile** `< 768px` — single column, bottom sheet modals, large tap targets
- **Tablet** `768px–1024px` — two-column where applicable, collapsible sidebar
- **Desktop** `> 1024px` — three-panel layouts, persistent sidebar, hover affordances

### 7. Accessible Throughout
- Keyboard navigation: `Tab`, `Enter`, `Escape`, `Arrow` keys on all interactive controls
- ARIA: `role="main"`, `aria-label` on map container, `aria-live` on status changes, `aria-describedby` on form fields
- Focus rings visible in both light and dark mode
- Skip-to-content link (`#main-content`) on every page
- Leaflet maps: keyboard zoom controls, screen-reader descriptions via `aria-label`

---

## Design Token Summary

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | Slate-600 (default, city-configurable) | Buttons, links, badges |
| `--color-destructive` | Red-600 | Error states, destructive actions |
| `--color-success` | Green-600 | Success toasts, confirmed states |
| `--color-warning` | Amber-500 | Warnings, out-of-bounds alerts |
| `--radius` | `0.75rem` | Card border radius |
| Font | Inter / system-ui | All text |
| Base spacing | `1.5rem` (24px) | Section padding |
| Touch target | `44px` min height | All interactive elements |

---

## Layout Shell

All pages share a common shell:

```
┌──────────────────────────────────────────────────────────┐
│ Skip to content link (visually hidden, focus-visible)    │
├──────┬───────────────────────────────────────────────────┤
│      │  Top header bar (mobile only)                     │
│ Side │   Logo + hamburger menu                           │
│ bar  ├───────────────────────────────────────────────────┤
│      │                                                   │
│ Nav  │   PAGE CONTENT (role="main" id="main-content")   │
│      │                                                   │
│ (per │                                                   │
│ sur- │                                                   │
│ face)│                                                   │
│      │                                                   │
└──────┴───────────────────────────────────────────────────┘
```

**Public portal sidebar:** minimal — logo, "Report an Issue" CTA, "My Ticket" lookup link, map link.  
**Staff console sidebar:** logo, Tickets, People, Reports, Account; Saved Views section below.  
**Admin panel sidebar:** logo + Admin badge, Categories, Departments, Substatuses, Templates, Users, API Keys.

---

## Screen Index

| Screen ID | Name | Route | Persona | Priority |
|-----------|------|-------|---------|----------|
| SCR-01 | Public Portal Home (Map + Report) | `/` | Marcus | P0 |
| SCR-02 | Report Submission Form | `/` (slide-up panel) | Marcus | P0 |
| SCR-03 | Submission Confirmation | `/tickets/[id]/confirm` | Marcus | P0 |
| SCR-04 | Public Ticket Status | `/tickets/[id]` | Marcus | P0 |
| SCR-05 | Public Issue Map | `/map` | Marcus | P0 |
| SCR-06 | Login | `/login` | Diane/Renata | P0 |
| SCR-07 | Staff Ticket Queue | `/staff/tickets` | Diane | P0 |
| SCR-08 | Staff Ticket Detail | `/staff/tickets/[id]` | Diane | P0 |
| SCR-09 | Staff People Search | `/staff/people` | Diane | P1 |
| SCR-10 | Staff Person Detail | `/staff/people/[id]` | Diane | P1 |
| SCR-11 | Staff Reports Dashboard | `/staff/reports` | Diane/Renata | P1 |
| SCR-12 | Admin Categories | `/admin/categories` | Renata | P0 |
| SCR-13 | Admin Departments | `/admin/departments` | Renata | P0 |
| SCR-14 | Admin Substatuses | `/admin/substatuses` | Renata | P0 |
| SCR-15 | Admin Response Templates | `/admin/response-templates` | Renata | P0 |
| SCR-16 | Admin Users | `/admin/users` | Renata | P0 |
| SCR-17 | Admin API Keys | `/admin/api-keys` | Renata | P0 |
| SCR-18 | Change Password | `/staff/account/password` | Diane | P0 |
