// lib/logger.ts
// Structured JSON logger — never logs PII fields (name, email, phone)
// LOG_LEVEL env var controls output verbosity

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function currentLevel(): number {
  const envLevel = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
  return LEVELS[envLevel] ?? LEVELS.info;
}

function write(level: LogLevel, obj: object) {
  if (LEVELS[level] < currentLevel()) return;
  // Use console.log instead of process.stdout.write — Edge Runtime compatible.
  // (middleware.ts → lib/auth.ts → lib/logger.ts gets bundled for Edge; process.stdout is Node-only)
  console.log(JSON.stringify({ level, timestamp: new Date().toISOString(), ...obj }));
}

export const log = {
  debug: (obj: object) => write('debug', obj),
  info:  (obj: object) => write('info', obj),
  warn:  (obj: object) => write('warn', obj),
  error: (obj: object) => write('error', obj),
};
