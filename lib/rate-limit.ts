// lib/rate-limit.ts
// In-process sliding window rate limiter for Open311 GET endpoints.
// Single-pod model: one process, shared Map — no Redis needed.

interface WindowEntry {
  count: number;
  windowStart: number;
}

const windows = new Map<string, WindowEntry>();
const WINDOW_MS = 60_000; // 1 minute

export function checkRateLimit(
  ip: string,
  limitPerMinute: number = parseInt(process.env.OPEN311_RATE_LIMIT ?? '60', 10)
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = windows.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // New window
    windows.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: limitPerMinute - 1, resetAt: now + WINDOW_MS };
  }

  if (entry.count >= limitPerMinute) {
    const resetAt = entry.windowStart + WINDOW_MS;
    return { allowed: false, remaining: 0, resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limitPerMinute - entry.count,
    resetAt: entry.windowStart + WINDOW_MS,
  };
}
