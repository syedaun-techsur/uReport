// app/api/admin/audit-log/route.ts
// GET /api/admin/audit-log — paginated, filterable AdminAuditLog viewer
// ADMIN-07: Audit log viewer
// Supports: ?actor_id, ?resource_type, ?action, ?start_date, ?end_date, ?page, ?page_size

import { NextRequest, NextResponse } from 'next/server';
import { requireSession, ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ─── Schema ────────────────────────────────────────────────────────────────

const AuditLogQuerySchema = z.object({
  actor_id: z.string().cuid().optional(),
  resource_type: z
    .enum(['Category', 'Department', 'Substatus', 'ResponseTemplate', 'User', 'ApiKey'])
    .optional(),
  action: z.string().max(50).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
});

// ─── GET /api/admin/audit-log ──────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = AuditLogQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid query parameters',
      400,
      parsed.error.flatten().fieldErrors as Record<string, string>
    );
  }

  const { actor_id, resource_type, action, start_date, end_date, page, page_size } = parsed.data;

  // Build where clause from query params
  const where: Record<string, unknown> = {};
  if (actor_id) where.actor_id = actor_id;
  if (resource_type) where.resource_type = resource_type;
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (start_date || end_date) {
    where.created_at = {
      ...(start_date ? { gte: new Date(start_date) } : {}),
      ...(end_date ? { lte: new Date(end_date) } : {}),
    };
  }

  const skip = (page - 1) * page_size;

  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      include: {
        actor: {
          select: { username: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: page_size,
    }),
  ]);

  return ok({
    data: logs,
    meta: {
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    },
  });
}
