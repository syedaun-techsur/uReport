# Flow-01: Constituent Ticket Tracking
## JRN-01.2 — Marcus checks ticket status without logging in

**Trigger:** Constituent opens a bookmarked URL `/tickets/[id]` or enters a ticket ID  
**User Stories:** US-1.1, US-1.2, US-1.3  
**Persona:** Marcus Webb (PER-01)  
**Device:** Mobile or desktop, no authentication required  

---

## Flow Diagram

```
[User opens /tickets/[id] or /map]
         │
         ├── Deep link URL ──▶ [Server fetches ticket by ID]
         │                              │
         │                     ├── Found ──▶ [Render public status page]
         │                     │
         │                     └── Not found ──▶ [404 "Ticket not found" page]
         │                                         [Link back to / to report new issue]
         │
         └── /map ──▶ [Public issue map loads]
                               │
                               ▼
                      [GET /api/tickets/public-map → GeoJSON]
                               │
                               ▼
                      [Leaflet map with clustered markers]
                               │
                               ├── Click cluster ──▶ [Zoom in + expand markers]
                               │
                               └── Click marker ──▶ [Popup: category, status, address]
                                                            │
                                                   [View details →] link
                                                            │
                                                            ▼
                                                  [/tickets/[id] public page]

[Public status page — /tickets/[id]]
         │
         ▼
[Ticket info displayed]
  • Ticket reference ID (large, prominent)
  • Category + status badge
  • Last updated timestamp
  • Address + mini-map
  • Public staff responses (is_public=true only)
  • "Copy link" button
         │
         ├── User copies link ──▶ [Clipboard toast "Link copied!"]
         │
         └── User exits ──▶ [Back to map / browser back]
```

---

## Key UX Notes

- **No login gate** — The entire `/tickets/[id]` and `/map` surface is public. Any authentication wall = Marcus files a duplicate report.
- **Status staleness** — Last-updated timestamp shown prominently even if status = "Open". "Received on [date]" communicates action.
- **Share affordance** — "Copy link" button (Clipboard API) with fallback `<input readonly>` for older browsers.
- **Shareable URL persistence** — URL `/tickets/[id]` is stable and never changes regardless of status updates.
- **Map data refresh** — If user returns to the `/map` tab after 5+ minutes of inactivity, data is refetched silently (no loading flash if cached data is still shown while refresh occurs).
