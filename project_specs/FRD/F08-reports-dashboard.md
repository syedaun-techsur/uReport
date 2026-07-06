
---

## F08: Reports & Metrics Dashboard

**Description:** An analytics dashboard available to staff and admin users providing configurable views of service request trends, workload distribution, and resolution performance. All charts are rendered client-side using a lightweight charting library (Recharts recommended). The geographic density view uses Leaflet. Results can be exported to CSV. All data is computed from live Postgres aggregation queries — no separate analytics store.

**Terminology:**
- **Date range** — A user-selected time window; preset options (Last 7d, Last 30d, Last 90d) plus a custom date picker.
- **Resolution time** — Duration between `Ticket.created_at` and the first `TicketHistory` entry with `action = "STATUS_CHANGE"` where `to_value = "closed"`.
- **Heat/cluster view** — A Leaflet map displaying ticket density; uses circle markers sized by cluster count, or a heatmap layer via Leaflet.heat plugin.
- **CSV export** — A download of the current filtered dataset as RFC 4180-compliant CSV.

**Sub-features:**
- Volume by category (bar/line chart, time series)
- Volume by department (bar/line chart, time series)
- Open vs. closed breakdown (donut chart with status drill-down)
- Average resolution time (mean and median per category and department)
- Geographic density map (Leaflet cluster or heat view)
- Date range picker (presets + custom)
- CSV export of current filtered result

**Process — Dashboard Load:**
1. Staff/admin navigates to `/staff/reports`. Auth.js middleware verifies `staff` or `admin` role.
2. Default date range: Last 30 days. Client sends requests to all chart endpoints in parallel.
3. Each chart component independently fetches its data endpoint and renders on receipt.
4. User changes date range → all chart components re-fetch with new `start_date` / `end_date`.

**Process — Volume by Category:**
1. Client sends `GET /api/staff/reports/volume-by-category?start_date=&end_date=&interval=day|week|month`.
2. Server executes: `SELECT category_id, COUNT(*) as count, date_trunc(interval, created_at) as period FROM tickets WHERE created_at BETWEEN ? AND ? GROUP BY category_id, period ORDER BY period`.
3. Returns time-series data grouped by category.
4. Client renders as grouped bar chart or multi-line chart; categories shown as colored series.

**Process — Open vs. Closed Breakdown:**
1. Client sends `GET /api/staff/reports/status-breakdown?start_date=&end_date=`.
2. Server returns `{ open: N, in_progress: N, closed: N, archived: N }` counts for tickets created in range.
3. Client renders as donut chart. Clicking a segment navigates to queue filtered by that status.

**Process — Average Resolution Time:**
1. Client sends `GET /api/staff/reports/resolution-time?start_date=&end_date=&group_by=category|department`.
2. Server computes, for all tickets closed in the date range: resolution time = `closed_at - created_at` where `closed_at` = first `TicketHistory.created_at` where `to_value = 'closed'`.
3. Returns `{ group_id, group_name, mean_hours, median_hours, count }[]`.
4. Client renders as horizontal bar chart.

**Process — Geographic Density View:**
1. Client sends `GET /api/staff/reports/geo-density?start_date=&end_date=&status=open|closed|all`.
2. Server returns GeoJSON FeatureCollection of ticket points (same structure as F01 public map but filtered by date range and status).
3. Leaflet renders with clustering or heat layer.

**Process — CSV Export:**
1. User clicks "Export CSV" on any chart or on the reports summary table.
2. Client sends `GET /api/staff/reports/export?start_date=&end_date=&format=csv` (or the specific endpoint for the active view).
3. Server streams a CSV response with `Content-Disposition: attachment; filename="ureport-export-{date}.csv"`.
4. CSV columns: `ticket_id, reference_id, category, department, status, substatus, address, lat, lng, created_at, updated_at, closed_at, resolution_hours, assignee`.

**Inputs:**

| Param | Type | Required | Constraints |
|-------|------|----------|-------------|
| `start_date` | `string (ISO8601 date)` | No | Default: 30 days ago |
| `end_date` | `string (ISO8601 date)` | No | Default: today; ≥ start_date |
| `interval` | `string` | No | `day\|week\|month`; default `day` |
| `group_by` | `string` | No | `category\|department`; default `category` |
| `status` | `string` | No | `open\|closed\|all`; default `all` |
| `format` | `string` | No | `json\|csv`; default `json` |

**Outputs:**

*Volume by category (sample):*
```json
[
  { "period": "2026-07-01", "category_id": "...", "category_name": "Pothole", "count": 14 },
  { "period": "2026-07-02", "category_id": "...", "category_name": "Pothole", "count": 9 }
]
```

*Status breakdown:*
```json
{ "open": 42, "in_progress": 17, "closed": 391, "archived": 5 }
```

*Resolution time:*
```json
[
  { "group_name": "Streets", "mean_hours": 48.2, "median_hours": 36.0, "count": 87 }
]
```

**Validation:**
- `start_date` must be ≤ `end_date`; otherwise `422 DATE_RANGE_INVALID`.
- Date range maximum span: 366 days (to prevent runaway aggregation queries); `422 DATE_RANGE_TOO_WIDE`.
- `interval` must be one of `day`, `week`, `month`.
- CSV export row limit: 10,000 rows; if exceeded, return first 10,000 with a `X-Export-Truncated: true` header.

**Error States:**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Unauthenticated | 401 | UNAUTHORIZED | "Authentication required" |
| Date range invalid | 422 | DATE_RANGE_INVALID | "start_date must be before end_date" |
| Date range too wide | 422 | DATE_RANGE_TOO_WIDE | "Date range cannot exceed 366 days" |
| Invalid interval | 422 | INVALID_INTERVAL | "interval must be day, week, or month" |

**API Surface (this feature):**
- `GET /api/staff/reports/volume-by-category` — time-series by category
- `GET /api/staff/reports/volume-by-department` — time-series by department
- `GET /api/staff/reports/status-breakdown` — open/closed counts
- `GET /api/staff/reports/resolution-time` — mean/median resolution
- `GET /api/staff/reports/geo-density` — GeoJSON for heatmap
- `GET /api/staff/reports/export` — CSV export
→ see `Y1-api.md §Reports`

**Schema Surface (this feature):** reads `Ticket`, `TicketHistory`, `Category`, `Department` — see `Y0-schema.md`.

---
