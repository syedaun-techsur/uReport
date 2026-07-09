// app/api/admin/departments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { UpdateDepartmentSchema } from '@/schemas/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Department not found', 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = UpdateDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  const data = parsed.data;

  // Check name uniqueness excluding current record
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.department.findFirst({
      where: { name: data.name, active: true, NOT: { id } },
    });
    if (duplicate) {
      return apiError('DUPLICATE_NAME', `Department name '${data.name}' is already in use`, 409);
    }
  }

  // Validate default_assignee_id is active user
  if (data.default_assignee_id) {
    const user = await prisma.user.findFirst({ where: { id: data.default_assignee_id, active: true } });
    if (!user) return apiError('INVALID_REFERENCE', 'default_assignee_id does not reference an active user', 422);
  }

  const isDeactivating = data.active === false && existing.active === true;

  // Count active categories if deactivating
  let active_category_count = 0;
  if (isDeactivating) {
    active_category_count = await prisma.category.count({
      where: { department_id: id, active: true },
    });
  }

  const action = isDeactivating ? 'DEPARTMENT_DEACTIVATED' : 'DEPARTMENT_UPDATED';

  const updated = await prisma.$transaction(async (tx) => {
    const dept = await tx.department.update({ where: { id }, data });
    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action,
        resource_type: 'Department',
        resource_id: id,
        metadata: { name: data.name ?? existing.name, active: data.active },
      },
    });
    return dept;
  });

  return ok({ ...updated, ...(isDeactivating ? { active_category_count } : {}) });
}
