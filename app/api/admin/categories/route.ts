// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { CreateCategorySchema } from '@/schemas/admin';

export async function GET(req: NextRequest) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { searchParams } = req.nextUrl;
  const activeParam = searchParams.get('active');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10)));

  let activeFilter: boolean | undefined;
  if (activeParam === 'true') activeFilter = true;
  else if (activeParam === 'false') activeFilter = false;
  // 'all' or missing: no filter

  const where = activeFilter !== undefined ? { active: activeFilter } : {};

  const [total, categories, groups, departments] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      include: {
        group: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ group_id: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.categoryGroup.findMany({ orderBy: { sort_order: 'asc' } }),
    prisma.department.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);

  return ok({
    data: categories,
    groups,
    departments,
    meta: {
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    },
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

  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  // sla_hours is not in Prisma schema — omit from DB writes
  const { sla_hours: _sla_hours, ...data } = parsed.data;

  // Check service_code uniqueness (all categories, not just active)
  const existing = await prisma.category.findUnique({ where: { service_code: data.service_code } });
  if (existing) {
    return apiError('DUPLICATE_SERVICE_CODE', `Service code '${data.service_code}' is already in use`, 409);
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

  // Use interactive transaction so audit log can reference the new category id
  const category = await prisma.$transaction(async (tx) => {
    const created = await tx.category.create({ data });
    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'CATEGORY_CREATED',
        resource_type: 'Category',
        resource_id: created.id,
        metadata: { name: created.name, service_code: created.service_code },
      },
    });
    return created;
  });

  return ok(category, 201);
}
