// app/api/admin/users/[id]/route.ts
// PATCH /api/admin/users/[id] — update role, active status, or department
// ADMIN-05: User account management
// T-06-11: Self-deactivation guard — admin cannot deactivate own account

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ─── Schema ────────────────────────────────────────────────────────────────

const UpdateUserSchema = z.object({
  role: z.enum(['staff', 'admin']).optional(),
  active: z.boolean().optional(),
  department_id: z.string().cuid().optional().nullable(),
});

// ─── PATCH /api/admin/users/[id] ──────────────────────────────────────────

export async function PATCH(
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

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid input',
      400,
      parsed.error.flatten().fieldErrors as Record<string, string>
    );
  }

  const { role, active, department_id } = parsed.data;

  // Load existing user
  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, role: true, active: true, department_id: true },
  });
  if (!existing) {
    return apiError('NOT_FOUND', 'User not found', 404);
  }

  // T-06-11: Prevent admin from deactivating their own account
  if (active === false && id === session.user.id) {
    return apiError('SELF_DEACTIVATION', 'Cannot deactivate your own account', 403);
  }

  // Determine audit action
  let action: string;
  if (active === false) action = 'USER_DEACTIVATED';
  else if (active === true) action = 'USER_REACTIVATED';
  else action = 'USER_UPDATED';

  // Build metadata (no password_hash — T-06-13)
  const changedFields: Record<string, unknown> = {};
  if (role !== undefined) changedFields.role = { from: existing.role, to: role };
  if (active !== undefined) changedFields.active = { from: existing.active, to: active };
  if (department_id !== undefined) changedFields.department_id = { from: existing.department_id, to: department_id };

  // Interactive transaction: update User + AdminAuditLog atomically
  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        ...(role !== undefined ? { role: role as 'staff' | 'admin' } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(department_id !== undefined ? { department_id } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        active: true,
        department_id: true,
        updated_at: true,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action,
        resource_type: 'User',
        resource_id: id,
        metadata: changedFields as object,
      },
    });

    return user;
  });

  return ok(updatedUser);
}
