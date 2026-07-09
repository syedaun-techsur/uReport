// app/api/admin/response-templates/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { CreateTemplateSchema } from '@/schemas/admin';

export async function GET(req: NextRequest) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { searchParams } = req.nextUrl;
  const activeParam = searchParams.get('active');
  const categoryId = searchParams.get('category_id');
  const departmentId = searchParams.get('department_id');

  let activeFilter: boolean | undefined;
  if (activeParam === 'true') activeFilter = true;
  else if (activeParam === 'false') activeFilter = false;

  const where: {
    active?: boolean;
    category_id?: string;
    department_id?: string;
  } = {};
  if (activeFilter !== undefined) where.active = activeFilter;
  if (categoryId) where.category_id = categoryId;
  if (departmentId) where.department_id = departmentId;

  const templates = await prisma.responseTemplate.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok({
    data: templates,
    meta: { total: templates.length },
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

  const parsed = CreateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  const data = parsed.data;

  // Check name uniqueness among active templates
  const existing = await prisma.responseTemplate.findFirst({
    where: { name: data.name, active: true },
  });
  if (existing) {
    return apiError('DUPLICATE_NAME', `Template name '${data.name}' is already in use`, 409);
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

  const template = await prisma.$transaction(async (tx) => {
    const created = await tx.responseTemplate.create({ data });
    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'TEMPLATE_CREATED',
        resource_type: 'ResponseTemplate',
        resource_id: created.id,
        metadata: { name: created.name },
      },
    });
    return created;
  });

  return ok(template, 201);
}
