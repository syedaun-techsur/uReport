// app/api/admin/api-keys/[id]/route.ts
// PATCH /api/admin/api-keys/[id] — revoke an API key
// ADMIN-06: API key management
// T-06-12: Revocation creates AdminAuditLog entry in same transaction

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// ─── PATCH /api/admin/api-keys/[id] ───────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  // 404 if key not found
  const existing = await prisma.apiKey.findUnique({
    where: { id },
    select: { id: true, label: true, revoked_at: true },
  });
  if (!existing) {
    return apiError('NOT_FOUND', 'API key not found', 404);
  }

  // 409 if already revoked
  if (existing.revoked_at !== null) {
    return apiError('ALREADY_REVOKED', 'API key is already revoked', 409);
  }

  const revokedAt = new Date();

  // T-06-12: Revocation + audit log in one atomic transaction
  const [updatedKey] = await prisma.$transaction([
    prisma.apiKey.update({
      where: { id },
      data: { revoked_at: revokedAt },
      select: { id: true, label: true, revoked_at: true },
    }),
    prisma.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'API_KEY_REVOKED',
        resource_type: 'ApiKey',
        resource_id: id,
        metadata: { label: existing.label },
      },
    }),
  ]);

  return ok(updatedKey);
}
