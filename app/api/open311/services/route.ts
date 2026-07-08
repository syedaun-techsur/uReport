// app/api/open311/services/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { categoryToService, toXml, wantsXml } from '@/lib/open311';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { group: true },
    });

    const services = categories.map(categoryToService);
    const xml = wantsXml(req);

    if (xml) {
      return new NextResponse(toXml(services, 'services'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    return NextResponse.json(services, { status: 200 });
  } catch (err) {
    log.error({ message: 'GET /api/open311/services failed', stack: (err as Error).stack });
    // Open311 error format: { errors: [{ code, description }] }
    const body = { errors: [{ code: 'server_error', description: 'Internal server error' }] };
    return NextResponse.json(body, { status: 500 });
  }
}
