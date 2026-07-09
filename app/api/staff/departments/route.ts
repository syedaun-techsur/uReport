// app/api/staff/departments/route.ts
// GET /api/staff/departments — returns active departments for filter dropdowns
// Auth: requires staff session

import { requireSession } from '@/lib/api-response';
import { ok } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;

  const departments = await prisma.department.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return ok({ data: departments });
}
