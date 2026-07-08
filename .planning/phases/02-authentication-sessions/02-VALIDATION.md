---
phase: 2
slug: 02-authentication-sessions
status: active
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-08
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E) + TypeScript compiler |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx tsc --noEmit 2>&1 | tail -5` |
| **Full suite command** | `npx playwright test e2e/auth-login.spec.ts --reporter=list` |
| **Estimated runtime** | ~30 seconds (TypeScript) / ~60 seconds (Playwright with running app) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit 2>&1 | tail -5`
- **After every plan wave:** Run `npx playwright test e2e/auth-login.spec.ts --reporter=list`
- **Before `/pivota_spec-verify-work`:** Full Playwright suite must be green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-07-01 | 07 | 1 | AUTH-01, AUTH-02 | static + tsc | `npx tsc --noEmit && grep -n 'OR' lib/auth.ts && grep -n 'sameSite.*none' lib/auth.ts` | ⬜ pending |
| 02-07-02 | 07 | 1 | AUTH-01 | E2E | `npx playwright test e2e/auth-login.spec.ts --reporter=list` | ⬜ pending |
| 02-08-01 | 08 | 1 | AUTH-01 | static | `bash -n .pivota/start-dev.sh && grep -n 'prisma migrate deploy' .pivota/start-dev.sh` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- `e2e/auth-login.spec.ts` — Playwright tests for auth flows (exists, established in prior plans)
- `playwright.config.ts` — configured with baseURL
- TypeScript compiler (`tsc --noEmit`) — available via `npx tsc`

No additional Wave 0 stubs or framework installs required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SameSite=None cookies work in preview iframe | AUTH-02 | Browser cookie jar behavior in embedded iframe requires a live browser session | Load app in Pivota preview iframe, log in, refresh — should stay logged in |
| Session persists across browser refresh | AUTH-02 | JWT cookie persistence requires running app + seeded DB | Log in, navigate to /staff/tickets, refresh — should not redirect to /login |
| Login with email in preview iframe | AUTH-01 | Cross-site iframe cookie delivery requires live browser | Open preview iframe, log in with admin@example.com, verify redirect to /staff/tickets |

---

## Validation Sign-Off

- [x] All tasks have `<verify>` with automated commands (tsc + grep + playwright)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No Wave 0 MISSING references — existing test infra is sufficient
- [x] No watch-mode flags in any verify commands
- [x] Feedback latency < 60s (TypeScript < 30s, Playwright < 60s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-08
