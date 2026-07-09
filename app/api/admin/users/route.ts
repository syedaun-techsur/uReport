// app/api/admin/users/route.ts
// GET /api/admin/users — paginated user list
// POST /api/admin/users — create a new staff/admin user
// ADMIN-05: User account management
// T-06-08: requireSession('admin') guards all access
// T-06-09: Explicit Prisma select allowlist — no password_hash in responses

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// ─── Schemas ───────────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(12).max(200).regex(/[A-Z]/).regex(/[0-9]/),
  role: z.enum(['staff', 'admin']),
  department_id: z.string().cuid().optional().nullable(),
});

// ─── GET /api/admin/users ──────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const page_size = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10)));
  const activeParam = searchParams.get('active');
  const roleParam = searchParams.get('role');

  // Build where filter
  const where: Record<string, unknown> = {};
  if (activeParam === 'true') where.active = true;
  else if (activeParam === 'false') where.active = false;
  // 'all' or missing → no filter
  if (roleParam === 'staff' || roleParam === 'admin') where.role = roleParam;

  const skip = (page - 1) * page_size;
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        active: true,
        department_id: true,
        department: { select: { name: true } },
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: page_size,
    }),
  ]);

  return ok({
    data: users,
    meta: {
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    },
  });
}

// ─── POST /api/admin/users ─────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid input',
      400,
      parsed.error.flatten().fieldErrors as Record<string, string>
    );
  }

  const { username, email, password, role, department_id } = parsed.data;

  // Check username uniqueness
  const existingByUsername = await prisma.user.findUnique({ where: { username } });
  if (existingByUsername) {
    return apiError('DUPLICATE_USERNAME', 'Username already exists', 409);
  }

  // Check email uniqueness
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    return apiError('DUPLICATE_EMAIL', 'Email already exists', 409);
  }

  // Hash password with bcrypt factor 12 (T-06-08)
  const password_hash = await bcrypt.hash(password, 12);

  // Interactive transaction: create User + AdminAuditLog atomically
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username,
        email,
        password_hash,
        role: role as 'staff' | 'admin',
        active: true,
        ...(department_id !== undefined ? { department_id } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        active: true,
        department_id: true,
        created_at: true,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        actor_id: session.user.id,
        action: 'USER_CREATED',
        resource_type: 'User',
        resource_id: newUser.id,
        metadata: { username, role },
      },
    });

    return newUser;
  });

  return ok(user, 201);
}
