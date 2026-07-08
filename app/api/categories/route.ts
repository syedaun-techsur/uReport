// app/api/categories/route.ts — GET /api/categories [PUBLIC]
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CategoryRecord } from '@/types/domain';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      include: {
        department: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: [{ group_id: 'asc' }, { name: 'asc' }],
    });

    const result: CategoryRecord[] = categories.map((c) => ({
      id: c.id,
      service_code: c.service_code,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      anon_allowed: c.anon_allowed,
      active: c.active,
      group_id: c.group_id,
      group_name: c.group?.name ?? null,
      department_id: c.department?.id ?? null,
      department_name: c.department?.name ?? null,
    }));

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('[GET /api/categories] error:', error);
    return NextResponse.json(
      { error: 'Failed to load categories' },
      { status: 500 }
    );
  }
}
