// scripts/migrate-and-start.js
const { execSync, spawn } = require('child_process');
const { Client } = require('pg');

const MAX_RETRIES = 12;
const RETRY_DELAY_BASE_MS = 2000;

async function waitForDb() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      console.log('[INFO] Database connection established.');
      return;
    } catch (err) {
      const delay = RETRY_DELAY_BASE_MS * Math.pow(1.5, i);
      console.log(`[INFO] Waiting for DB... retry ${i + 1}/${MAX_RETRIES} (${Math.round(delay)}ms)`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('[FATAL] Could not connect to database after max retries.');
  process.exit(1);
}

async function detectGeoMode() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    await client.query('SELECT PostGIS_Version()');
    await client.end();
    process.env.GEO_MODE = 'postgis';
    console.log('[INFO] GEO_MODE=postgis (PostGIS extension detected)');
  } catch {
    try { await client.end(); } catch {}
    process.env.GEO_MODE = 'haversine';
    console.log('[INFO] GEO_MODE=haversine (PostGIS unavailable — using Haversine fallback)');
  }
}

async function main() {
  // 1. Validate required env vars
  for (const key of ['DATABASE_URL', 'AUTH_SECRET']) {
    if (!process.env[key]) { console.error(`[FATAL] Missing: ${key}`); process.exit(1); }
  }

  // 2. Wait for DB
  await waitForDb();

  // 3. Run migrations (idempotent)
  console.log('[INFO] Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('[INFO] Migrations complete.');

  // 4. Optional seed
  if (process.env.SEED_ON_BOOT === 'true') {
    console.log('[INFO] Running seed script...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  }

  // 5. PostGIS detection — sets GEO_MODE env var for the Next.js process
  await detectGeoMode();

  // 6. Start Next.js — bind 0.0.0.0:3000 (required for K8s health probes)
  console.log('[INFO] Starting Next.js server...');
  const next = spawn('npx', ['next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
    stdio: 'inherit',
    env: process.env,  // GEO_MODE is in process.env at this point
  });
  next.on('exit', (code) => process.exit(code ?? 1));
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
