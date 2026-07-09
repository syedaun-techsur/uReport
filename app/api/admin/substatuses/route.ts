// app/api/admin/substatuses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { CreateSubstatusSchema } from '@/schemas/admin';
import type { TicketStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { searchParams } = req.nextUrl;
  const statusParam = searchParams.get('status') as TicketStatus | null;

  const validStatuses: TicketStatus[] = ['open', 'in_progress', 'closed', 'archived'];

  const where =
    statusParam && validStatuses.includes(statusParam) ? { status: statusParam } : {};

  const substatuses = await prisma.substatus.findMany({
    where,
    orderBy: [{ status: 'asc' }, { sort_order: 'asc' }],
  });

  return ok({
    data: substatuses,
    meta: { total: substatuses.length },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = CreateSubstatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  const data = parsed.data;

  // Check label uniqueness within same status
  const existing = await prisma.substatus.findFirst({
    where: { label: data.label, status: data.status as TicketStatus },
  });
  if (existing) {
    return apiError(
      'DUPLICATE_SUBSTATUS_LABEL',
      `Label '${data.label}' already exists for status '${data.status}'`,
      409
    );
  }

  const substatus = await prisma.$transaction(async (tx) => {
    const created = await tx.substatus.create({
      data: {
        label: data.label,
        internal_label: data.internal_label ?? null,
        status: data.status as TicketStatus,
        sort_order: data.sort_order,
        active: data.active,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'SUBSTATUS_CREATED',
        resource_type: 'Substatus',
        resource_id: created.id,
        metadata: { label: created.label, status: created.status },
      },
    });
    return created;
  });

  return ok(substatus, 201);
}
