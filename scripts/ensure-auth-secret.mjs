#!/usr/bin/env node
/**
 * Ensure a usable Auth.js signing secret exists before the server starts.
 *
 * Auth.js v5 requires AUTH_SECRET; with none set it throws MissingSecret and
 * every /api/auth/* route 500s (login is impossible). The runtime contract is
 * that the platform does NOT inject AUTH_SECRET — the app must provide it.
 * The committed .env ships AUTH_SECRET empty, so out of the box login is broken
 * in dev/preview.
 *
 * This runs as `predev`/`prestart`. Precedence, highest first:
 *   1. A real AUTH_SECRET already in the process env (e.g. production secret) → do nothing.
 *   2. A non-empty AUTH_SECRET already in .env.local → do nothing (persist across restarts).
 *   3. Otherwise generate a 32-byte hex secret and append it to .env.local.
 *
 * .env.local is gitignored and takes precedence over .env in Next.js, so the
 * generated value overrides the empty AUTH_SECRET in .env. No secret is committed.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_LOCAL = resolve(process.cwd(), '.env.local');

function hasNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// 1. Real secret already provided by the environment.
if (hasNonEmpty(process.env.AUTH_SECRET)) {
  process.exit(0);
}

// 2. Non-empty AUTH_SECRET already persisted in .env.local.
if (existsSync(ENV_LOCAL)) {
  const contents = readFileSync(ENV_LOCAL, 'utf8');
  const match = contents.match(/^\s*AUTH_SECRET\s*=\s*(.+)\s*$/m);
  if (match && hasNonEmpty(match[1].replace(/^["']|["']$/g, ''))) {
    process.exit(0);
  }
}

// 3. Generate and persist.
const secret = randomBytes(32).toString('hex');
const line = `AUTH_SECRET=${secret}\n`;
if (existsSync(ENV_LOCAL)) {
  const contents = readFileSync(ENV_LOCAL, 'utf8');
  const prefix = contents.length > 0 && !contents.endsWith('\n') ? '\n' : '';
  appendFileSync(ENV_LOCAL, prefix + line);
} else {
  writeFileSync(ENV_LOCAL, line);
}
console.log('[ensure-auth-secret] generated AUTH_SECRET and wrote it to .env.local');
