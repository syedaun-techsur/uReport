// app/api/open311/requests/[service_request_id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ticketToServiceRequest, toXml, wantsXml } from '@/lib/open311';
import { checkRateLimit } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ service_request_id: string }> }
): Promise<NextResponse> {
  const { service_request_id } = await params;
  const xml = wantsXml(req);

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const rateResult = checkRateLimit(ip);
  if (!rateResult.allowed) {
    const retryAfterSecs = Math.ceil((rateResult.resetAt - Date.now()) / 1000);
    const body = { errors: [{ code: 'rate_limit', description: 'Too many requests' }] };
    if (xml) {
      return new NextResponse(toXml(body, 'errors'), {
        status: 429,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Retry-After': String(retryAfterSecs),
        },
      });
    }
    return new NextResponse(JSON.stringify(body), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSecs) },
    });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: service_request_id },
      include: {
        category: true,
        department: true,
        responses: {
          where: { is_public: true },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!ticket) {
      const body = { errors: [{ code: 'not_found', description: 'Service request not found' }] };
      if (xml) {
        return new NextResponse(toXml(body, 'errors'), {
          status: 404,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
      }
      return NextResponse.json(body, { status: 404 });
    }

    // GeoReport v2 spec: single-item response is still wrapped in an array
    const serviceRequest = ticketToServiceRequest(ticket);
    const responseBody = [serviceRequest];

    if (xml) {
      return new NextResponse(toXml(responseBody, 'service_requests'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err) {
    log.error({
      message: `GET /api/open311/requests/${service_request_id} failed`,
      stack: (err as Error).stack,
    });
    const body = { errors: [{ code: 'server_error', description: 'Internal server error' }] };
    return NextResponse.json(body, { status: 500 });
  }
}
