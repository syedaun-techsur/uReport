// app/api/admin/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { UpdateCategorySchema } from '@/schemas/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Category not found', 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = UpdateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  // sla_hours is not in Prisma schema — omit from DB writes
  const { sla_hours: _sla_hours, ...data } = parsed.data;

  // Check service_code uniqueness excluding current record
  if (data.service_code && data.service_code !== existing.service_code) {
    const duplicate = await prisma.category.findFirst({
      where: { service_code: data.service_code, NOT: { id } },
    });
    if (duplicate) {
      return apiError('DUPLICATE_SERVICE_CODE', `Service code '${data.service_code}' is already in use`, 409);
    }
  }

  // Validate department_id references active department
  if (data.department_id) {
    const dept = await prisma.department.findFirst({ where: { id: data.department_id, active: true } });
    if (!dept) return apiError('INVALID_REFERENCE', 'department_id does not reference an active department', 422);
  }

  // Validate group_id references existing CategoryGroup
  if (data.group_id) {
    const group = await prisma.categoryGroup.findUnique({ where: { id: data.group_id } });
    if (!group) return apiError('INVALID_REFERENCE', 'group_id does not reference an existing category group', 422);
  }

  const isDeactivating = data.active === false && existing.active === true;

  // Count open tickets if deactivating
  let open_ticket_count = 0;
  if (isDeactivating) {
    open_ticket_count = await prisma.ticket.count({
      where: { category_id: id, status: { in: ['open', 'in_progress'] } },
    });
  }

  const action = isDeactivating ? 'CATEGORY_DEACTIVATED' : 'CATEGORY_UPDATED';
  const metadata: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!['department_id', 'group_id'].includes(k)) {
      metadata[k] = v;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const cat = await tx.category.update({ where: { id }, data });
    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action,
        resource_type: 'Category',
        resource_id: id,
        metadata,
      },
    });
    return cat;
  });

  return ok({ ...updated, ...(isDeactivating ? { open_ticket_count } : {}) });
}
