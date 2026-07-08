// app/api/open311/requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ticketToServiceRequest, toXml, wantsXml, parseApiKey, verifyApiKey,
} from '@/lib/open311';
import { checkRateLimit } from '@/lib/rate-limit';
import { Open311PostRequestSchema, Open311GetRequestsQuerySchema } from '@/schemas/open311';
import { log } from '@/lib/logger';

// ─── Helper: Open311 error response (JSON or XML) ────────────────────────────
function open311Err(
  code: string,
  description: string,
  status: number,
  xml: boolean
): NextResponse {
  const body = { errors: [{ code, description }] };
  if (xml) {
    return new NextResponse(toXml(body, 'errors'), {
      status,
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
  return NextResponse.json(body, { status });
}

// ─── GET /api/open311/requests ────────────────────────────────────────────────
// O311-04: Filterable, paginated service requests with pagination headers.
// Public endpoint — rate limited per IP.
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const rateResult = checkRateLimit(ip);
  if (!rateResult.allowed) {
    const retryAfterSecs = Math.ceil((rateResult.resetAt - Date.now()) / 1000);
    return new NextResponse(
      JSON.stringify({ errors: [{ code: 'rate_limit', description: 'Too many requests' }] }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSecs),
        },
      }
    );
  }

  const xml = wantsXml(req);

  // Parse and validate query params
  const rawParams = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parseResult = Open311GetRequestsQuerySchema.safeParse(rawParams);
  if (!parseResult.success) {
    return open311Err('validation_error', parseResult.error.message, 422, xml);
  }

  const { service_request_id, service_code, status, start_date, end_date, page, page_size } = parseResult.data;

  // Build Prisma WHERE clause
  const where: Record<string, unknown> = {};

  if (service_request_id) {
    where.id = service_request_id;
  }
  if (service_code) {
    where.service_code = service_code;
  }
  if (status) {
    // O311-04: open → IN('open','in_progress'); closed → IN('closed','archived')
    where.status = status === 'open'
      ? { in: ['open', 'in_progress'] }
      : { in: ['closed', 'archived'] };
  }
  if (start_date) {
    where.created_at = { ...(where.created_at as object ?? {}), gte: new Date(start_date) };
  }
  if (end_date) {
    where.created_at = { ...(where.created_at as object ?? {}), lte: new Date(end_date) };
  }

  try {
    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * page_size,
        take: page_size,
        include: {
          category: true,
          department: true,
          responses: {
            where: { is_public: true },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const serviceRequests = tickets.map(ticketToServiceRequest);
    const hasNextPage = page * page_size < total;

    const paginationHeaders = {
      'X-Total-Count': String(total),
      'X-Page': String(page),
      'X-Page-Size': String(page_size),
      'X-Has-Next-Page': String(hasNextPage),
    };

    if (xml) {
      return new NextResponse(toXml(serviceRequests, 'service_requests'), {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8', ...paginationHeaders },
      });
    }

    // GeoReport v2 spec: response body is a raw JSON array (no envelope)
    return new NextResponse(JSON.stringify(serviceRequests), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...paginationHeaders },
    });
  } catch (err) {
    log.error({ message: 'GET /api/open311/requests failed', stack: (err as Error).stack });
    return open311Err('server_error', 'Internal server error', 500, xml);
  }
}

// ─── POST /api/open311/requests ───────────────────────────────────────────────
// O311-03: Create a new service request. Requires valid write-scoped API key.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const xml = wantsXml(req);

  // Step 1: Extract and verify API key (from TechArch §5.2, FRD §F07.3)
  const rawKey = parseApiKey(req);
  if (!rawKey) {
    return open311Err('key_not_found', 'API key was not found', 401, xml);
  }

  const keyResult = await verifyApiKey(prisma, rawKey, 'write');
  if (!keyResult.valid) {
    if (keyResult.error === 'key_read_only') {
      return open311Err('key_read_only', 'API key does not have write permission', 403, xml);
    }
    return open311Err('key_not_found', 'API key was not found', 401, xml);
  }

  // Step 2: Parse request body (supports both JSON and form-encoded per Open311 spec)
  let rawBody: Record<string, unknown>;
  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      rawBody = await req.json();
    } else {
      // application/x-www-form-urlencoded (Open311 clients commonly use form POST)
      const formData = await req.formData();
      rawBody = Object.fromEntries(formData.entries());
    }
  } catch {
    return open311Err('validation_error', 'Invalid request body', 422, xml);
  }

  // Step 3: Validate body
  const parseResult = Open311PostRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const msg = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return open311Err('validation_error', msg, 422, xml);
  }

  const data = parseResult.data;

  // Step 4: Look up Category by service_code
  const category = await prisma.category.findFirst({
    where: { service_code: data.service_code, active: true },
    include: { department: true, group: true },
  });

  if (!category) {
    return open311Err('service_not_found', 'Service not found', 404, xml);
  }

  // Step 5: Contact required check (mirrors F00 logic)
  const hasContact = data.first_name || data.last_name || data.email || data.phone;
  if (!category.anon_allowed && !hasContact) {
    return open311Err('contact_required', 'Contact information required for this service', 422, xml);
  }

  // Step 6: Create Ticket (and optional Person) in a transaction
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const newTicket = await tx.ticket.create({
        data: {
          service_code: data.service_code,
          description: data.description,
          address: data.address_string ?? `${data.lat ?? 0}, ${data.long ?? 0}`,
          lat: data.lat ?? null,
          lng: data.long ?? null,       // internal field is 'lng'; Open311 input is 'long'
          status: 'open',
          category_id: category.id,
          department_id: category.department_id ?? null,
        },
        include: {
          category: true,
          department: true,
          responses: true,
        },
      });

      // Create Person and TicketPerson if contact info provided
      if (hasContact) {
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || null;
        const person = await tx.person.create({
          data: {
            name,
            email: data.email ?? null,
            phone: data.phone ?? null,
          },
        });
        await tx.ticketPerson.create({
          data: {
            ticket_id: newTicket.id,
            person_id: person.id,
            role: 'submitter',
          },
        });
      }

      return newTicket;
    });

    // Step 7: Return 201 with array containing one service_request (GeoReport v2 spec)
    const serviceRequest = ticketToServiceRequest(ticket);
    const responseBody = [serviceRequest];

    if (xml) {
      return new NextResponse(toXml(responseBody, 'service_requests'), {
        status: 201,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    }

    return NextResponse.json(responseBody, { status: 201 });
  } catch (err) {
    log.error({ message: 'POST /api/open311/requests failed', stack: (err as Error).stack });
    return open311Err('server_error', 'Internal server error', 500, xml);
  }
}
