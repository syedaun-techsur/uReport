// app/api/admin/substatuses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { UpdateSubstatusSchema } from '@/schemas/admin';
import type { TicketStatus } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const existing = await prisma.substatus.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Substatus not found', 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = UpdateSubstatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  const data = parsed.data;
  const effectiveStatus = (data.status ?? existing.status) as TicketStatus;

  // Check label uniqueness within same status (excluding current)
  if (data.label || data.status) {
    const duplicate = await prisma.substatus.findFirst({
      where: {
        label: data.label ?? existing.label,
        status: effectiveStatus,
        NOT: { id },
      },
    });
    if (duplicate) {
      return apiError(
        'DUPLICATE_SUBSTATUS_LABEL',
        `Label '${data.label ?? existing.label}' already exists for status '${effectiveStatus}'`,
        409
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const sub = await tx.substatus.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.internal_label !== undefined && { internal_label: data.internal_label }),
        ...(data.status !== undefined && { status: data.status as TicketStatus }),
        ...(data.sort_order !== undefined && { sort_order: data.sort_order }),
        ...(data.active !== undefined && { active: data.active }),
      },
    });
    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'SUBSTATUS_UPDATED',
        resource_type: 'Substatus',
        resource_id: id,
        metadata: { label: sub.label, status: sub.status, active: sub.active },
      },
    });
    return sub;
  });

  return ok(updated);
}
