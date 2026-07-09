// app/api/admin/departments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { CreateDepartmentSchema } from '@/schemas/admin';

export async function GET(req: NextRequest) {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const { searchParams } = req.nextUrl;
  const activeParam = searchParams.get('active');

  let activeFilter: boolean | undefined;
  if (activeParam === 'true') activeFilter = true;
  else if (activeParam === 'false') activeFilter = false;

  const where = activeFilter !== undefined ? { active: activeFilter } : {};

  const departments = await prisma.department.findMany({
    where,
    include: {
      default_assignee: { select: { id: true, username: true, email: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok({
    data: departments.map((d) => ({
      ...d,
      user_count: d._count.users,
      _count: undefined,
    })),
    meta: { total: departments.length },
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

  const parsed = CreateDepartmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }

  const data = parsed.data;

  // Check dept name uniqueness among active depts
  const existing = await prisma.department.findFirst({
    where: { name: data.name, active: true },
  });
  if (existing) {
    return apiError('DUPLICATE_NAME', `Department name '${data.name}' is already in use`, 409);
  }

  // Validate default_assignee_id is active user
  if (data.default_assignee_id) {
    const user = await prisma.user.findFirst({ where: { id: data.default_assignee_id, active: true } });
    if (!user) return apiError('INVALID_REFERENCE', 'default_assignee_id does not reference an active user', 422);
  }

  const department = await prisma.$transaction(async (tx) => {
    const created = await tx.department.create({ data });
    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'DEPARTMENT_CREATED',
        resource_type: 'Department',
        resource_id: created.id,
        metadata: { name: created.name },
      },
    });
    return created;
  });

  return ok(department, 201);
}
