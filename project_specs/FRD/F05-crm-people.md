
---

## F05: Staff CRM / People Management

**Description:** A lightweight constituent relationship management module enabling staff to view, search, link, and manage contact records associated with ticket submissions. When a constituent provides contact information on submission, a `Person` record is automatically created and linked to their ticket. Staff can manually link or unlink persons, flag duplicates, execute merge operations with a full audit trail, and anonymize records on GDPR-style request. All CRM data is accessible only to authenticated staff and admin users.

**Terminology:**
- **Person** — A constituent contact record: name, email, phone, notes, preferred contact method.
- **TicketPerson** — Join table between `Ticket` and `Person` with a `role` field (`submitter` or `contact`).
- **Duplicate flag** — A staff marker on a `Person` record noting it may be a duplicate of another record.
- **Merge** — The operation of combining two `Person` records into one: all `TicketPerson` rows from the source are re-pointed to the target; the source is then soft-deleted with an audit note.
- **Anonymization** — Nulling out all PII fields on a `Person` record (`name`, `email`, `phone`, `notes`) and setting `anonymized_at`; linked tickets are unaffected but display "Anonymous Constituent."

**Sub-features:**
- Person search (name, email, phone) using Postgres FTS
- Person detail view (contact info, linked tickets, notes)
- Manual link/unlink of Person ↔ Ticket
- Duplicate flag workflow
- Person merge with audit trail
- GDPR anonymization of Person record
- Auto-create Person on ticket submission (see F00)

**Process — Person Search:**
1. Staff navigates to `/staff/people` or uses the search panel on a ticket detail page.
2. Staff types a search query (name, email, or phone fragment).
3. Client sends `GET /api/staff/people?q=<query>`.
4. Server performs: `WHERE person_search_vector @@ plainto_tsquery('english', ?)` (tsvector over name, email, phone fields).
5. Returns paginated list of matching `Person` records (no PII in list snippet for non-admin unless directly needed).

**Process — Link / Unlink Person to Ticket:**
1. From ticket detail (F04) "Linked Constituent" panel, staff clicks "Link Person."
2. A search modal opens; staff searches and selects a `Person`.
3. Client sends `POST /api/staff/tickets/[id]/persons` with `{ person_id, role: "contact" }`.
4. Server creates `TicketPerson` row. Appends `TicketHistory` entry with `action = "PERSON_LINKED"`.
5. To unlink: `DELETE /api/staff/tickets/[id]/persons/[person_id]`. Appends `TicketHistory` with `action = "PERSON_UNLINKED"`. (Cannot unlink the original `submitter` unless admin.)

**Process — Merge Persons:**
1. Staff views a `Person` record flagged as duplicate. Clicks "Merge with…" and selects the target (canonical) person.
2. Client sends `POST /api/staff/people/merge` with `{ source_id, target_id }`.
3. Server, in a transaction:
   a. Re-points all `TicketPerson` rows from `source_id` to `target_id` (avoid duplicate join rows via upsert).
   b. Copies non-null fields from source to target if target field is null (name, email, phone, notes).
   c. Sets `Person.merged_into_id = target_id` and `Person.deleted_at = now()` on source.
   d. Appends a `TicketHistory` note on each affected ticket: "Person records merged by [actor]."
4. Returns `{ target_person_id, tickets_relinked: number }`.

**Process — Anonymize Person:**
1. Staff (or admin) navigates to `Person` detail, clicks "Anonymize Record."
2. Confirmation dialog warns: "All personal information will be permanently removed."
3. Client sends `PATCH /api/staff/people/[id]/anonymize`.
4. Server nulls `name`, `email`, `phone`, `notes`, sets `anonymized_at = now()`.
5. Linked tickets remain; their display substitutes "Anonymous Constituent."
6. Audit log entry created: `action = "PERSON_ANONYMIZED"`, `actor_id`, timestamp.

**Inputs:**

*Person search:*

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `q` | `string` | Yes | ≥2 chars, ≤200 chars |
| `page` | `number` | No | ≥1; default 1 |
| `page_size` | `number` | No | 10–50; default 20 |

*Link person to ticket:*

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `person_id` | `string (cuid)` | Yes | Must exist and not be anonymized |
| `role` | `string` | Yes | `submitter\|contact` |

*Merge persons:*

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `source_id` | `string (cuid)` | Yes | Must exist, not anonymized |
| `target_id` | `string (cuid)` | Yes | Must exist, not anonymized, ≠ source_id |

**Outputs:**
- Person search: `{ data: Person[], meta: PaginationMeta }`
- Person detail: full `Person` object with `linked_tickets: TicketSummary[]`
- Merge: `{ target_person_id, tickets_relinked: number }`
- Anonymize: `204 No Content`

**Validation:**
- Search query minimum 2 characters to prevent full-table FTS scan.
- Merge: `source_id ≠ target_id`; both must be non-anonymized, non-deleted.
- Unlink: staff cannot unlink the original `submitter` role unless admin.
- Anonymize: once `anonymized_at` is set, the record cannot be un-anonymized.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Person not found | 404 | NOT_FOUND | "Person not found" |
| Merge same person | 422 | MERGE_SAME | "Source and target must be different people" |
| Merge anonymized source | 422 | PERSON_ANONYMIZED | "Cannot merge an anonymized record" |
| Unlink submitter by staff | 403 | FORBIDDEN | "Only admins can unlink the original submitter" |
| Already anonymized | 409 | ALREADY_ANONYMIZED | "This record has already been anonymized" |

**API Surface (this feature):**
- `GET /api/staff/people` — person search
- `GET /api/staff/people/[id]` — person detail
- `PATCH /api/staff/people/[id]` — update person record
- `POST /api/staff/people/merge` — merge two persons
- `PATCH /api/staff/people/[id]/anonymize` — anonymize person
- `POST /api/staff/tickets/[id]/persons` — link person to ticket
- `DELETE /api/staff/tickets/[id]/persons/[person_id]` — unlink person
→ see `Y1-api.md §CRM`

**Schema Surface (this feature):** uses `Person`, `TicketPerson`, `Ticket`, `TicketHistory` — see `Y0-schema.md`.

---
