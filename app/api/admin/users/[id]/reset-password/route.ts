// app/api/admin/users/[id]/reset-password/route.ts
// POST /api/admin/users/[id]/reset-password — admin-initiated password reset
// ADMIN-05: User account management
// T-06-10: token_version increment invalidates all active sessions for that user
// T-06-13: Never include password or hash in audit metadata

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// ─── Schema ────────────────────────────────────────────────────────────────

const ResetPasswordSchema = z.object({
  new_password: z.string().min(12).max(200).regex(/[A-Z]/).regex(/[0-9]/),
});

// ─── POST /api/admin/users/[id]/reset-password ────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = ResetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid input',
      400,
      parsed.error.flatten().fieldErrors as Record<string, string>
    );
  }

  const { new_password } = parsed.data;

  // 404 if user not found
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return apiError('NOT_FOUND', 'User not found', 404);
  }

  // Hash new password with bcrypt factor 12
  const newHash = await bcrypt.hash(new_password, 12);

  // T-06-10: Atomic transaction — update password + increment token_version (invalidates sessions)
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        password_hash: newHash,
        token_version: { increment: 1 },
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'USER_PASSWORD_RESET',
        resource_type: 'User',
        resource_id: id,
        // T-06-13: NEVER include new_password or password_hash in metadata
        metadata: { note: 'Admin-initiated password reset' },
      },
    }),
  ]);

  return ok({ message: 'Password reset successfully' });
}
