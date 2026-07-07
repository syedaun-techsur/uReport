---
status: resolved
trigger: "Gap 1 — No seed users exist after fresh DB spin-up"
created: 2026-07-07T00:00:00Z
updated: 2026-07-07T00:00:00Z
---

## Current Focus

hypothesis: SEED_ON_BOOT env var is required but not set in the UAT environment
test: Read migrate-and-start.js for conditional seed logic
expecting: Seed only runs when SEED_ON_BOOT=true
next_action: confirmed — env var must be provided

## Symptoms

expected: Seeded staff user can log in at /login with valid credentials
actual: No seed users exist — login fails with invalid credentials
errors: Invalid credentials on login
reproduction: Spin up fresh DB without SEED_ON_BOOT=true set
started: After Phase 1 seed data was removed and fresh DB spun up

## Eliminated

- hypothesis: seed script does not create staff/admin users
  evidence: prisma/seed.ts clearly upserts both admin and staff users with bcrypt-hashed passwords (lines 149-173)
  timestamp: 2026-07-07T00:00:00Z

- hypothesis: db:seed script is missing from package.json
  evidence: package.json line 11 has "db:seed": "tsx prisma/seed.ts" and prisma.seed key also set (line 41)
  timestamp: 2026-07-07T00:00:00Z

## Evidence

- timestamp: 2026-07-07T00:00:00Z
  checked: scripts/migrate-and-start.js lines 56-60
  found: Seed is wrapped in `if (process.env.SEED_ON_BOOT === 'true')` — it is opt-in, not automatic
  implication: On fresh DB boot, seed never runs unless the env var is explicitly set to "true"

- timestamp: 2026-07-07T00:00:00Z
  checked: prisma/seed.ts lines 144-177
  found: Creates admin (admin/Admin1234!secure) and staff (staff/Staff1234!secure) users with bcrypt hashes
  implication: Seed logic is correct and complete; the problem is purely invocation

- timestamp: 2026-07-07T00:00:00Z
  checked: package.json scripts
  found: `start` runs `node scripts/migrate-and-start.js` — no default seed; `db:seed` exists as manual script
  implication: Startup path never seeds automatically without SEED_ON_BOOT=true

## Resolution

root_cause: The seed script is correct and complete, but migrate-and-start.js only runs it when SEED_ON_BOOT=true is set; the UAT environment does not set this env var on fresh DB boot.
fix: Set SEED_ON_BOOT=true in the UAT environment (docker-compose, K8s manifest, or .env) so the seed runs automatically on fresh DB spin-up.
verification: N/A — diagnosis only
files_changed: []
