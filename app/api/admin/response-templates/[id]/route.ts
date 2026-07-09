// app/api/admin/response-templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { UpdateTemplateSchema } from '@/schemas/admin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { id } = await params;

  const existing = await prisma.responseTemplate.findUnique({ where: { id } });
  if (!existing) return apiError('NOT_FOUND', 'Response template not found', 404);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = UpdateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  const data = parsed.data;

  // Check name uniqueness (excluding current record)
  if (data.name && data.name !== existing.name) {
    const duplicate = await prisma.responseTemplate.findFirst({
      where: { name: data.name, active: true, NOT: { id } },
    });
    if (duplicate) {
      return apiError('DUPLICATE_NAME', `Template name '${data.name}' is already in use`, 409);
    }
  }

  // Validate category_id reference
  if (data.category_id) {
    const category = await prisma.category.findFirst({ where: { id: data.category_id } });
    if (!category) return apiError('INVALID_REFERENCE', 'category_id does not reference an existing category', 422);
  }

  // Validate department_id reference
  if (data.department_id) {
    const dept = await prisma.department.findFirst({ where: { id: data.department_id } });
    if (!dept) return apiError('INVALID_REFERENCE', 'department_id does not reference an existing department', 422);
  }

  const isDeactivating = data.active === false && existing.active === true;
  const action = isDeactivating ? 'TEMPLATE_DEACTIVATED' : 'TEMPLATE_UPDATED';

  const updated = await prisma.$transaction(async (tx) => {
    const tmpl = await tx.responseTemplate.update({ where: { id }, data });
    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action,
        resource_type: 'ResponseTemplate',
        resource_id: id,
        metadata: { name: tmpl.name, active: tmpl.active },
      },
    });
    return tmpl;
  });

  return ok(updated);
}
