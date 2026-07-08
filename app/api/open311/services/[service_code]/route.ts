// app/api/open311/services/[service_code]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { categoryToService, toXml, wantsXml } from '@/lib/open311';
import { log } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ service_code: string }> }
): Promise<NextResponse> {
  const { service_code } = await params;

  try {
    const category = await prisma.category.findFirst({
      where: { service_code, active: true },
      include: { group: true },
    });

    if (!category) {
      const body = { errors: [{ code: 'service_not_found', description: 'Service not found' }] };
      if (wantsXml(req)) {
        return new NextResponse(toXml(body, 'errors'), {
          status: 404,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
      }
      return NextResponse.json(body, { status: 404 });
    }

    // v1: no extended attributes (metadata=false per categoryToService)
    const service = { ...categoryToService(category), attributes: [] };
    const xml = wantsXml(req);

    if (xml) {
      return new NextResponse(toXml([service], 'services'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    return NextResponse.json(service, { status: 200 });
  } catch (err) {
    log.error({ message: `GET /api/open311/services/${service_code} failed`, stack: (err as Error).stack });
    const body = { errors: [{ code: 'server_error', description: 'Internal server error' }] };
    return NextResponse.json(body, { status: 500 });
  }
}
