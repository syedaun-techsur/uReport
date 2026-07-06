
---

## Y2: Cross-Feature Error Catalog

This catalog lists all error codes used across features, normalized by HTTP status code. All error responses (except Open311 endpoints) use the common envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "field_errors": { "field": "message" }
  }
}
```

Open311 error format: `{ "errors": [{ "code": "error_code", "description": "message" }] }`

---

### 400 Bad Request

| Code | Feature | Trigger |
|------|---------|---------|
| `INVALID_ID` | F01, F04 | Ticket or resource ID is not a valid CUID format |
| `BBOX_INVALID` | F03, F07 | bbox param cannot be parsed as 4 floats |
| `INVALID_INTERVAL` | F08 | interval param is not day/week/month |
| `INVALID_FORMAT` | F07 | format param is not json or xml |

---

### 401 Unauthorized

| Code | Feature | Trigger |
|------|---------|---------|
| `UNAUTHORIZED` | F02–F09 | No valid Auth.js session on protected route |
| `AUTH_FAILED` | F02 | Invalid credentials on login |
| `key_not_found` | F07 | API key missing or hash not found (Open311 format) |

---

### 403 Forbidden

| Code | Feature | Trigger |
|------|---------|---------|
| `FORBIDDEN` | F02, F05 | Staff role accessing admin route; staff trying to unlink submitter |
| `TRANSITION_FORBIDDEN` | F04 | Staff attempting to re-open a closed ticket (admin-only) |
| `SELF_DEACTIVATION` | F06 | Admin trying to deactivate their own account |
| `key_read_only` | F07 | Write operation with read-scoped API key (Open311 format) |

---

### 404 Not Found

| Code | Feature | Trigger |
|------|---------|---------|
| `NOT_FOUND` | All | Requested resource ID does not exist |
| `service_not_found` | F07 | Open311 service_code not found or inactive |

---

### 409 Conflict

| Code | Feature | Trigger |
|------|---------|---------|
| `DUPLICATE_SERVICE_CODE` | F06 | Category service_code already exists |
| `DUPLICATE_USERNAME` | F06 | Username already taken |
| `DUPLICATE_EMAIL` | F06 | Email already registered |
| `CONFLICT` | F03 | Bookmark name already exists for user |
| `ALREADY_REVOKED` | F06 | API key already has a revoked_at timestamp |
| `ALREADY_ANONYMIZED` | F05 | Person record already anonymized |

---

### 422 Unprocessable Entity

| Code | Feature | Trigger |
|------|---------|---------|
| `VALIDATION_ERROR` | F00, F02, F06 | Zod schema validation failed; `field_errors` populated |
| `INVALID_CATEGORY` | F00, F07 | category_id exists but is inactive |
| `CONTACT_REQUIRED` | F00, F07 | Category has `anon_allowed=false` and no contact info provided |
| `MEDIA_TOO_LARGE` | F00, F04 | File exceeds `MEDIA_MAX_SIZE_MB` limit |
| `MEDIA_TYPE_INVALID` | F00, F04 | MIME type not in allowed list |
| `MEDIA_TOO_MANY` | F00, F04 | More than 5 files in a single upload |
| `DATE_RANGE_INVALID` | F03, F08 | start_date > end_date |
| `DATE_RANGE_TOO_WIDE` | F08 | Date range exceeds 366 days |
| `BULK_EMPTY` | F03 | Bulk operation called with empty ticket_ids array |
| `BULK_TOO_LARGE` | F03 | Bulk operation called with >100 ticket_ids |
| `SUBSTATUS_MISMATCH` | F04 | substatus_id belongs to a different parent status |
| `EMPTY_RESPONSE` | F04 | Response body is empty after trimming |
| `USER_NOT_FOUND` | F04 | assignee_id does not match an active user |
| `WRONG_PASSWORD` | F02 | Current password incorrect during change |
| `PASSWORD_POLICY` | F02, F06 | New password does not meet complexity requirements |
| `PASSWORD_MISMATCH` | F02 | confirm_password ≠ new_password |
| `MERGE_SAME` | F05 | source_id == target_id in merge operation |
| `PERSON_ANONYMIZED` | F05 | Attempting to merge/link an anonymized person |
| `INVALID_ROLE` | F06 | role field is not staff or admin |
| `INVALID_SCOPE` | F06 | scope field is not read or write |
| `location_required` | F07 | Open311 POST missing lat/long and address_string |
| `validation_error` | F07 | Open311 field validation failure |

---

### 429 Too Many Requests

| Code | Feature | Trigger |
|------|---------|---------|
| `rate_limit` | F07 | Open311 GET endpoint rate limit exceeded (`OPEN311_RATE_LIMIT` req/min) |

**Rate limit response headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
Retry-After: 30
```

---

### 500 Internal Server Error

| Code | Feature | Trigger |
|------|---------|---------|
| `SUBMISSION_FAILED` | F00 | Unhandled DB error during ticket creation |
| `server_error` | F07 | Open311 unhandled server error |
| `INTERNAL_ERROR` | All | Generic unhandled error (logged with stack trace) |

---

### 503 Service Unavailable

| Code | Feature | Trigger |
|------|---------|---------|
| `DB_UNAVAILABLE` | F01, F09 | Database connection failed |
| `MIGRATIONS_PENDING` | F09 | Readiness probe: pending migrations detected |
| `GEOCODE_UNAVAILABLE` | F00 | Nominatim address search service unreachable (non-blocking — map pin still works) |

---

### Security Error Handling Principles

1. **No enumeration:** Login errors always return the same message regardless of whether username exists or password is wrong.
2. **No stack traces to clients:** 500 errors return only a generic message; full stack trace is written to structured logs only.
3. **No PII in error messages:** Field names may appear in `field_errors` keys but values must not echo user-submitted PII.
4. **Consistent timing:** Auth operations use bcrypt which is inherently slow; no timing oracle possible.

---
