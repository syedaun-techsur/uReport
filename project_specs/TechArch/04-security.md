---

## 5. Security Architecture

### 5.1 Authentication

**Provider:** Auth.js v5 (NextAuth) with Credentials provider. No OAuth/social login in v1.

**Flow:**
```
POST /api/auth/[...nextauth] (login)
  │
  ├─ Extract username + password from form body
  ├─ authorizeUser(username, password):
  │     SELECT * FROM "User" WHERE lower(username) = lower($1) AND active = true
  │     bcrypt.compare(submitted_password, user.password_hash)
  │     Return { id, email, username, role, department_id, token_version } on success
  │     Return null on failure (Auth.js treats null as auth failed)
  │
  ├─ On success: Auth.js generates JWT with:
  │     { sub: user.id, role, username, department_id, token_version, exp: now + AUTH_SESSION_TTL }
  │
  └─ Cookie: __Secure-next-auth.session-token
       httpOnly: true
       SameSite: Lax
       Secure: true (production), false (dev with HTTP)
       Path: /
       MaxAge: AUTH_SESSION_TTL (default: 28800 = 8 hours)
```

**Token Version Invalidation:**
```
Admin-initiated password reset:
  UPDATE "User" SET token_version = token_version + 1 WHERE id = $1

On every protected request:
  auth() → decode JWT → JWT.token_version < User.token_version → reject (401)
```

### 5.2 Authorization Model

#### Role Hierarchy

```
public (unauthenticated)
  └── Can access: /, /map, /tickets/[id], /api/tickets (POST), /api/categories, /api/v2/**, /api/health/**, /api/media/[id]*

staff
  └── Can access: all public routes + /staff/** (pages and /api/staff/**)
  └── Cannot access: /admin/** routes

admin
  └── Can access: all staff routes + /admin/** (pages and /api/admin/**)
  └── Special permissions: re-open closed tickets, unlink submitter persons
```

#### Route Guard (middleware.ts)

```typescript
// middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Guard /staff/** and /admin/**
  if (pathname.startsWith('/staff/') || pathname.startsWith('/admin/')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Staff trying to access admin routes
    if (pathname.startsWith('/admin/') && session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/staff/tickets', req.url));
    }
  }

  // Guard /api/staff/** and /api/admin/** (Route Handlers check independently too)
  if (pathname.startsWith('/api/staff/') || pathname.startsWith('/api/admin/')) {
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }
    if (pathname.startsWith('/api/admin/') && session.user.role !== 'admin') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
    }
  }
});

export const config = {
  matcher: ['/staff/:path*', '/admin/:path*', '/api/staff/:path*', '/api/admin/:path*'],
};
```

#### Open311 API Key Authentication

```typescript
// lib/open311.ts — API key verification
import crypto from 'crypto';

export async function verifyApiKey(
  prisma: PrismaClient,
  rawKey: string,
  requiredScope: 'read' | 'write'
): Promise<{ valid: boolean; error?: string }> {
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  
  const apiKey = await prisma.apiKey.findUnique({ where: { key_hash: keyHash } });
  
  if (!apiKey) return { valid: false, error: 'key_not_found' };
  if (apiKey.revoked_at !== null) return { valid: false, error: 'key_not_found' };
  if (requiredScope === 'write' && apiKey.scope !== 'write') {
    return { valid: false, error: 'key_read_only' };
  }
  
  // Update last_used_at (fire-and-forget, don't await)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { last_used_at: new Date() }
  }).catch(() => {});
  
  return { valid: true };
}
```

### 5.3 Data Protection

#### Password Storage
- bcrypt hash with work factor **12** (`bcrypt.hash(password, 12)`)
- Work factor 12 ≈ 250ms on a modern server — sufficient to resist brute force
- Passwords **never** logged, never returned in API responses, never stored in plaintext

#### API Key Storage
- Plaintext key generated as 32 bytes of cryptographically random hex (64 chars)
- Only SHA-256 hash stored in `ApiKey.key_hash`
- Plaintext shown **once** in admin UI modal; never retrievable again
- Key validation: `SHA-256(submitted_key) === stored_hash` — O(1) with BTree index

#### SQL Injection Prevention
- **All** database access via Prisma ORM parameterized queries
- Raw SQL (FTS, geo queries) uses `prisma.$queryRaw` with tagged template literals — parameters are automatically escaped
- No string concatenation in SQL fragments

#### PII Protection
- `Person` records (name, email, phone) visible only to `staff` and `admin` roles
- Anonymization: nulls all PII fields, sets `anonymized_at` — irreversible
- Structured logs **must not** contain name, email, phone fields (enforced by logger interface)
- Public ticket endpoints filter out contact information entirely

#### Session Security
```
Cookie flags:
  httpOnly: true          → XSS cannot access token
  SameSite: Lax           → CSRF protection for cross-site navigation
  Secure: true (prod)     → HTTPS-only transmission
  Path: /                 → Available to full app
  
JWT claims:
  exp: now + AUTH_SESSION_TTL   → Short-lived (default 8h)
  token_version: N              → Allows invalidation on password reset
```

### 5.4 Transport Security

| Layer | Requirement |
|-------|-------------|
| HTTPS | Enforced at K8s ingress layer (outside app scope) |
| HSTS | Handled by K8s ingress / Pivota platform |
| X-Frame-Options | **NOT emitted** — Pivota Preview embeds app in iframe |
| CSP frame-ancestors | **NOT set to 'none' or 'self'** — iframe requirement |
| Content-Type | All API responses include correct Content-Type |
| X-Content-Type-Options | `nosniff` — set in `next.config.ts` headers |

```typescript
// next.config.ts — security headers
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // NOTE: No X-Frame-Options — Pivota embeds this app in an iframe
  // NOTE: No frame-ancestors in CSP — same reason
];
```

### 5.5 Rate Limiting

Rate limiting applies **only** to Open311 public GET endpoints to prevent scraping abuse.

```
OPEN311_RATE_LIMIT env var (default: 60 req/min per IP)

Algorithm: sliding window per IP address
  - In-process Map<ip, { count, windowStart }>
  - windowStart = current minute boundary (Math.floor(Date.now() / 60000))
  - If count >= limit: return 429 with Retry-After header
  - Single-pod model: no Redis needed; state is per-process

Response headers on rate-limited response:
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 0
  Retry-After: <seconds until window reset>
```

Staff and admin endpoints are not rate-limited (Auth.js session required).

### 5.6 Input Validation

All inputs validated with **Zod** before any database access:

```
Request lifecycle:
  1. Parse request body / query params
  2. Zod schema.safeParse(input)
  3. On failure → 422 VALIDATION_ERROR with field_errors
  4. On success → extract typed data → DB operation

Additional runtime checks (after Zod):
  - category_id exists and is active (F00 submission)
  - substatus belongs to correct parent status (F04 update)
  - assignee is an active user (F04 assignment)
  - Merge: source ≠ target, neither anonymized (F05)
  - Admin: no self-deactivation (F06e)
```

### 5.7 Security Error Handling Principles

1. **No enumeration:** Login errors always return "Invalid username or password" regardless of whether username exists
2. **No stack traces to clients:** 500 errors return generic message; full stack written to structured logs only
3. **No PII in error messages:** `field_errors` keys may name fields but values must not echo user-submitted PII
4. **Consistent timing:** Auth uses bcrypt which is inherently slow; no timing oracle attack possible
5. **No secrets in logs:** `AUTH_SECRET`, `DATABASE_URL`, `key_hash` values never written to stdout

---
