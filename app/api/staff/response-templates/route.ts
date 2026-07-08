import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// ─── GET /api/staff/response-templates ────────────────────────────────────
// Returns active response templates, optionally filtered by category/department
// (FRD §F04 — STAFF-09 template picker in ResponseComposer)

export async function GET(req: NextRequest) {
  // T-05-19: requireSession before any DB access
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;

  const { searchParams } = new URL(req.url);
  const category_id = searchParams.get('category_id') ?? undefined;
  const department_id = searchParams.get('department_id') ?? undefined;

  const templates = await prisma.responseTemplate.findMany({
    where: {
      active: true,
      ...(category_id ? { category_id } : {}),
      ...(department_id ? { department_id } : {}),
    },
    select: {
      id: true,
      name: true,
      body: true,
      category_id: true,
      department_id: true,
    },
    orderBy: { name: 'asc' },
  });

  return ok({ data: templates });
}
