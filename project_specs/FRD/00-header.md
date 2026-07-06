# Functional Requirements Document
## uReport NG — City of Bloomington Municipal 311/CRM

**Project Acronym:** uReportNG  
**FRD Version:** 1.0  
**Date:** 2026-07-06  
**Status:** Active  
**Based on PRD:** PRD-uReportNG.md v1.0  

---

## Scope

This document specifies the detailed functional behavior of every feature in uReport NG. It provides sufficient precision for a developer to implement each feature without ambiguity: inputs, outputs, validation rules, error handling, API contracts, and database schemas are fully described. This FRD does not cover deployment runbooks or UI visual design — those are addressed in TechArch-uReportNG.md and design mockups respectively.

---

## How to Read This Document

- **Feature chunks** are numbered `F00`–`F09`, corresponding to PRD features F0–F9.
- **Cross-feature chunks** are prefixed `Y0`–`Y3` (schema, API, errors, integrations).
- Feature IDs in `FXXX` format reference features within this document; `PRD §FN` references the source PRD section.
- All API paths are relative to the application root (e.g., `/api/v2/services`).
- HTTP status codes follow RFC 9110.
- Zod validation schemas are expressed as TypeScript Zod object shapes.
- Database DDL is expressed as Prisma schema syntax.
- `[STAFF]` annotations indicate fields/behaviors visible only to authenticated staff or admin.
- `[ADMIN]` annotations indicate behaviors restricted to admin role only.

---

## Conventions

| Convention | Meaning |
|------------|---------|
| `required` | Field must be present and non-empty |
| `optional` | Field may be absent or null |
| `[AUTH: staff]` | Route/action requires staff or admin session |
| `[AUTH: admin]` | Route/action requires admin session only |
| `[AUTH: api-key]` | Route requires valid Open311 API key header/param |
| `[PUBLIC]` | No authentication required |
| `tsvector` | Postgres FTS indexed column, auto-updated via trigger |
| `bytea` | Postgres binary column used for media storage |

---

## Shared Terminology

- **Ticket** — A single constituent service request (synonymous with "service request" in Open311). Primary entity.
- **Person** — A constituent contact record linked to one or more tickets.
- **Category** — A service category (e.g., "Pothole", "Graffiti"). Maps to Open311 `service_code`.
- **CategoryGroup** — Optional grouping of categories for UI display.
- **Department** — A city department responsible for handling a category of tickets.
- **Status** — Top-level workflow state of a ticket: `open`, `in_progress`, `closed`, `archived`.
- **Substatus** — Admin-configurable refinement within a status (e.g., "Awaiting Parts" under `in_progress`).
- **TicketHistory** — Append-only audit log entry recording every change to a ticket.
- **Action** — A specific type of change recorded in TicketHistory (status change, assignment, comment, media upload).
- **Response** — A staff note on a ticket; either public-facing or internal-only.
- **ResponseTemplate** — A canned response body with optional variable placeholders.
- **Media** — A file attachment (image, document) stored as Postgres `bytea`.
- **Bookmark / BookmarkedFilter** — A saved ticket queue filter set, per staff user.
- **IssueType** — Synonym for Category in some Open311 contexts.
- **Client / ApiKey** — An Open311 API key record for third-party integrators.
- **Open311 GeoReport v2** — The open standard API for service request interoperability.
- **FTS** — Full-Text Search, implemented via Postgres `tsvector` + GIN indexes.
- **PostGIS** — Optional Postgres extension for geospatial queries. App degrades gracefully if absent.
- **Haversine** — App-level math fallback for distance calculations when PostGIS is unavailable.

---

## Table of Contents

| Chunk | Feature |
|-------|---------|
| [F00](#f00-public-constituent-portal) | F0: Public Constituent Portal |
| [F01](#f01-constituent-issue-tracking) | F1: Constituent Issue Tracking |
| [F02](#f02-authentication--role-based-sessions) | F2: Authentication & Role-Based Sessions |
| [F03](#f03-staff-ticket-queue) | F3: Staff Ticket Queue |
| [F04](#f04-staff-ticket-detail) | F4: Staff Ticket Detail |
| [F05](#f05-staff-crm--people-management) | F5: Staff CRM / People Management |
| [F06](#f06-admin-panel) | F6: Admin Panel |
| [F07](#f07-open311-georeport-v2-api) | F7: Open311 GeoReport v2 API |
| [F08](#f08-reports--metrics-dashboard) | F8: Reports & Metrics Dashboard |
| [F09](#f09-infrastructure--platform) | F9: Infrastructure & Platform |
| [Y0](#y0-database-schema) | Database Schema (Prisma DDL) |
| [Y1](#y1-api-endpoint-catalog) | API Endpoint Catalog |
| [Y2](#y2-error-catalog) | Cross-Feature Error Catalog |
| [Y3](#y3-integration-points) | External Integration Points |

---
