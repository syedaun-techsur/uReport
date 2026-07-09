// app/api/admin/substatuses/reorder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { ReorderSubstatusSchema } from '@/schemas/admin';

export async function PATCH(req: NextRequest) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = ReorderSubstatusSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  const { items } = parsed.data;

  await prisma.$transaction([
    ...items.map((item) =>
      prisma.substatus.update({
        where: { id: item.id },
        data: { sort_order: item.sort_order },
      })
    ),
    prisma.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'SUBSTATUS_REORDERED',
        resource_type: 'Substatus',
        resource_id: '',
        metadata: { count: items.length },
      },
    }),
  ]);

  return ok({ reordered: items.length });
}
