// scripts/ensure-database.js
//
// Pivota "one compose contract" DB bootstrap (DinD era). Since the sidecar
// architecture was removed, the platform injects NO DATABASE_URL — every
// sandbox has a working Docker daemon and the app self-provides its datastore
// via its own docker-compose.yml.
//
// This helper guarantees DATABASE_URL points at a reachable Postgres BEFORE
// migrate/seed/serve, in either run mode:
//   • predev  → dev-db-setup.js   → `next dev`
//   • prestart→ migrate-and-start.js → `next start`
//
// Behaviour (idempotent, non-destructive):
//   1. DATABASE_URL already set (a real/injected DB — production, or a platform
//      that still provides one) → use it, touch nothing.
//   2. Otherwise, if docker-compose.yml is present → `docker compose up -d db`,
//      point the app at it, and PERSIST DATABASE_URL to .env.local so the
//      sibling Next.js process (spawned separately, after this one exits) picks
//      it up. This mirrors how ensure-auth-secret.mjs persists AUTH_SECRET.
//   3. Neither possible → leave DATABASE_URL unset; the caller logs and
//      degrades gracefully.
//
// `docker compose up -d` converges an already-running stack, the .env.local
// write skips a key that is already declared, and the compose named volume
// keeps data across restarts — so re-running on every boot is safe.
const { execSync } = require('child_process');
const { existsSync, readFileSync, appendFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const { Client } = require('pg');

const ENV_LOCAL = resolve(process.cwd(), '.env.local');
const COMPOSE_FILE = resolve(process.cwd(), 'docker-compose.yml');

// Must match the `db` service in docker-compose.yml. The DB is published on the
// sandbox's own loopback, so the native app connects over 127.0.0.1. This is a
// local/preview throwaway credential, never a production secret.
const COMPOSE_DATABASE_URL =
  'postgresql://ureport:ureport_dev_pw@127.0.0.1:5432/ureport';

// Append KEY=value to .env.local (Next.js loads it, precedence over .env), so a
// later, separate `next dev`/`next start` process inherits it. Idempotent.
function persistEnvLocal(key, value) {
  const line = `${key}=${value}\n`;
  if (existsSync(ENV_LOCAL)) {
    const contents = readFileSync(ENV_LOCAL, 'utf8');
    if (new RegExp(`^\\s*${key}\\s*=`, 'm').test(contents)) return; // already declared
    const prefix = contents.length > 0 && !contents.endsWith('\n') ? '\n' : '';
    appendFileSync(ENV_LOCAL, prefix + line);
  } else {
    writeFileSync(ENV_LOCAL, line);
  }
}

async function waitForDb(connectionString, maxRetries = 30, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch {
      try { await client.end(); } catch {}
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

// Ensure DATABASE_URL is set to a reachable Postgres, self-provisioning one via
// docker compose when the platform injected none. Returns true when DATABASE_URL
// ends up set (pre-existing or freshly provisioned).
async function ensureDatabase() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return true; // injected / already configured — do nothing
  }

  if (!existsSync(COMPOSE_FILE)) {
    console.log('[ensure-database] DATABASE_URL not set and no docker-compose.yml — cannot self-provide a DB.');
    return false;
  }

  console.log('[ensure-database] No DATABASE_URL injected — starting the compose "db" service...');
  try {
    execSync('docker compose up -d db', { stdio: 'inherit' });
  } catch (err) {
    console.error(`[ensure-database] WARN "docker compose up -d db" failed: ${err.message}`);
    return false;
  }

  // Set for THIS process (its migrate/seed children inherit it) and persist for
  // the sibling Next.js process.
  process.env.DATABASE_URL = COMPOSE_DATABASE_URL;
  persistEnvLocal('DATABASE_URL', COMPOSE_DATABASE_URL);
  console.log('[ensure-database] DATABASE_URL set to the compose DB and persisted to .env.local.');

  if (await waitForDb(COMPOSE_DATABASE_URL)) {
    console.log('[ensure-database] Compose DB is reachable.');
  } else {
    console.error('[ensure-database] WARN compose DB not reachable after retries — callers will retry/degrade.');
  }
  return true;
}

module.exports = { ensureDatabase, persistEnvLocal, COMPOSE_DATABASE_URL };
