// app/api/admin/api-keys/route.ts
// GET /api/admin/api-keys — list API keys (never expose key_hash)
// POST /api/admin/api-keys — generate new API key (plaintext shown ONCE)
// ADMIN-06: API key management
// T-06-07: Plaintext key returned ONLY in 201 response; SHA-256 hash stored in DB

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes, createHash } from 'node:crypto';

// ─── Schemas ───────────────────────────────────────────────────────────────

const CreateApiKeySchema = z.object({
  label: z.string().min(1).max(100),
  scope: z.enum(['read', 'write']),
});

// ─── GET /api/admin/api-keys ───────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  // T-06-07: Never return key_hash — explicit select allowlist only
  const keys = await prisma.apiKey.findMany({
    select: {
      id: true,
      label: true,
      scope: true,
      last_used_at: true,
      revoked_at: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });

  // Add computed status field
  const keysWithStatus = keys.map((key) => ({
    ...key,
    status: key.revoked_at ? 'revoked' : 'active',
  }));

  return ok(keysWithStatus);
}

// ─── POST /api/admin/api-keys ──────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = CreateApiKeySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid input',
      400,
      parsed.error.flatten().fieldErrors as Record<string, string>
    );
  }

  const { label, scope } = parsed.data;

  // Check label uniqueness among non-revoked keys
  const existingKey = await prisma.apiKey.findFirst({
    where: { label, revoked_at: null },
    select: { id: true },
  });
  if (existingKey) {
    return apiError('DUPLICATE_LABEL', 'An active API key with this label already exists', 409);
  }

  // T-06-07: Generate plaintext key — 64 hex chars from 32 random bytes
  const plaintextKey = randomBytes(32).toString('hex');
  // Store only SHA-256 hash — plaintext never persisted
  const key_hash = createHash('sha256').update(plaintextKey).digest('hex');

  // Interactive transaction: create ApiKey + AdminAuditLog
  const key = await prisma.$transaction(async (tx) => {
    const newKey = await tx.apiKey.create({
      data: {
        label,
        key_hash,
        scope: scope as 'read' | 'write',
      },
      select: {
        id: true,
        label: true,
        scope: true,
        created_at: true,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'API_KEY_GENERATED',
        resource_type: 'ApiKey',
        resource_id: newKey.id,
        metadata: { label, scope },
      },
    });

    return newKey;
  });

  // T-06-07: plaintext_key returned ONLY in this 201 response — never stored, never returned again
  return ok(
    {
      id: key.id,
      label: key.label,
      scope: key.scope,
      plaintext_key: plaintextKey,
      created_at: key.created_at,
    },
    201
  );
}
