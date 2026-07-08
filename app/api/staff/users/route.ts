import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// ─── GET /api/staff/users?q= ───────────────────────────────────────────────
// Staff user typeahead for assignee picker (FRD §F04: STAFF-08 assignee search)

export async function GET(req: NextRequest) {
  // T-05-19: requireSession before any DB access
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? undefined;

  const users = await prisma.user.findMany({
    where: {
      active: true,
      ...(q && q.length >= 1
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      username: true,
      department_id: true,
      role: true,
    },
    take: 20,
    orderBy: { username: 'asc' },
  });

  return ok({
    data: users.map((u) => ({
      id: u.id,
      username: u.username,
      department_id: u.department_id,
      role: u.role,
    })),
  });
}
