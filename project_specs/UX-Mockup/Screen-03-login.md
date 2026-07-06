# Screen-03: Login
## Route: `/login`  |  User Stories: US-2.1, US-2.2

**Purpose:** Staff and admin authentication. No self-registration. No OAuth.

---

## Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                                                     │
│                 🏛 Bloomington 311                   │  ← centered logo/wordmark
│                                                     │
│         ┌───────────────────────────────┐           │
│         │                               │           │
│         │   Staff Login                 │           │  ← card, 400px max-width
│         │                               │           │
│         │   Username                    │           │
│         │   ┌─────────────────────┐    │           │
│         │   │                     │    │           │
│         │   └─────────────────────┘    │           │
│         │                               │           │
│         │   Password                    │           │
│         │   ┌─────────────────────┐    │           │
│         │   │                  👁 │    │           │  ← show/hide password toggle
│         │   └─────────────────────┘    │           │
│         │                               │           │
│         │   ┌─────────────────────┐    │           │
│         │   │   Sign In           │    │           │  ← primary button, full width
│         │   └─────────────────────┘    │           │
│         │                               │           │
│         └───────────────────────────────┘           │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Information Hierarchy

| Priority | Content | Placement |
|----------|---------|-----------|
| Primary | Username + password fields | Center of card |
| Primary | Sign In button | Below fields |
| Secondary | Page title "Staff Login" | Card header |
| Tertiary | City logo/wordmark | Above card |

---

## States

| State | Appearance | User Feedback |
|-------|------------|---------------|
| Default | Empty form | — |
| Loading | Spinner in button, "Signing in…", fields disabled | — |
| Invalid credentials | Red error banner below form: "Invalid username or password" | `role="alert"` |
| Redirected from protected route | Blue info banner: "Please sign in to continue" | `role="alert"` |
| Session expired | Amber info banner: "Your session has expired. Please sign in again." | `role="alert"` |
| Success | Redirect to `callbackUrl` (default `/staff/tickets`) | — |

---

## Interactive Elements

| Element | Type | Behavior |
|---------|------|----------|
| Username input | `<input type="text">` | `autocomplete="username"` |
| Password input | `<input type="password">` | `autocomplete="current-password"` |
| Show/hide password | Icon toggle button | Toggles `type` between `password` / `text`; `aria-label` updates |
| Sign In button | Primary button | Submits form; shows spinner during POST |
| Error banner | Alert | `role="alert"` auto-announced to screen readers |

---

## Security Notes (UX)

- Error message is always the same generic string regardless of whether username or password was wrong — no enumeration
- Password field has `autocomplete="current-password"` to support password managers
- `callbackUrl` param in URL is used for post-login redirect (preserved through form submission)
- No "Remember me" checkbox in v1 (session TTL configurable server-side via `AUTH_SESSION_TTL`)
