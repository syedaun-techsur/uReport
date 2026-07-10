// scripts/dev-db-setup.js
//
// Preview / dev-server DB bootstrap. The platform boots the dev server via
// `npm run dev`, which runs this as the `predev` hook FIRST — and, crucially,
// AFTER the platform has installed node_modules, so the prisma/tsx CLIs exist
// (this is why migrate belongs here and not in the wrapper's pre-install slot).
//
// When a platform database is present (DATABASE_URL set — the K8s/Local sidecar,
// or a compose DB under DinD), ensure the schema is migrated and seed data
// exists BEFORE the dev server serves its first request. Without this the
// preview comes up on an empty DB: every data route 500s and login is
// impossible because no users were ever seeded.
//
// This mirrors scripts/migrate-and-start.js (the production `start` path) minus
// the server launch — same wait-for-DB + `migrate deploy` + seed-if-empty
// sequence. Idempotent: `migrate deploy` no-ops when up to date and the seed
// only runs on an empty DB (or when SEED_ON_BOOT=true). Non-fatal: on any hiccup
// it logs loudly and exits 0 so the dev server still starts (a persistent
// failure is caught by the platform boot-smoke, not left silent).
const { execSync } = require('child_process');
const { Client } = require('pg');

const MAX_RETRIES = 12;
const RETRY_DELAY_BASE_MS = 2000;

async function waitForDb() {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('[dev-db-setup] Database connection established.');
      return true;
    } catch (err) {
      try { await client.end(); } catch {}
      const delay = RETRY_DELAY_BASE_MS * Math.pow(1.5, i);
      console.log(`[dev-db-setup] Waiting for DB... retry ${i + 1}/${MAX_RETRIES} (${Math.round(delay)}ms)`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return false;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('[dev-db-setup] DATABASE_URL not set — skipping migrate/seed (no platform DB injected; app owns its own DB).');
    return;
  }

  if (!(await waitForDb())) {
    console.error('[dev-db-setup] WARN could not reach the database after retries — skipping migrate/seed; the dev server will still start (DB-backed routes will error until the DB is reachable).');
    return;
  }

  try {
    console.log('[dev-db-setup] Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('[dev-db-setup] Migrations complete.');
  } catch (err) {
    console.error(`[dev-db-setup] WARN migrate failed (continuing): ${err.message}`);
    return; // no point seeding onto a schema that did not migrate
  }

  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const { rows } = await client.query('SELECT COUNT(*)::int AS cnt FROM "User"');
    await client.end();
    const userCount = rows[0].cnt;
    if (userCount === 0 || process.env.SEED_ON_BOOT === 'true') {
      console.log(`[dev-db-setup] ${userCount === 0 ? 'Empty DB detected — running' : 'SEED_ON_BOOT=true —'} seed script...`);
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
      console.log('[dev-db-setup] Seed complete.');
    } else {
      console.log(`[dev-db-setup] Seed skipped — ${userCount} user(s) already exist.`);
    }
  } catch (err) {
    console.error(`[dev-db-setup] WARN seed step failed (continuing): ${err.message}`);
  }
}

main().catch((err) => { console.error('[dev-db-setup] WARN', err); process.exit(0); });
