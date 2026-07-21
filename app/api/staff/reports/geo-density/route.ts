import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/api-response';
import { GeoDensityQuerySchema } from '@/schemas/reports';
import { resolveDateRange } from '@/lib/reports';
import { Sql, sqltag as sql, empty } from '@prisma/client/runtime/library';

export async function GET(req: NextRequest) {
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = GeoDensityQuerySchema.safeParse(params);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid query params';
    const code = msg.includes('366') ? 'DATE_RANGE_TOO_WIDE' : 'DATE_RANGE_INVALID';
    return NextResponse.json({ error: { code, message: msg } }, {
      status: 422,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const { status } = parsed.data;
  const { startDate, endDate } = resolveDateRange(parsed.data.start_date, parsed.data.end_date);

  // Build status IN clause — use sql with safe enum list (NOT user input)
  // status param already validated by Zod to be 'open' | 'closed' | 'all'
  let statusFilter: Sql;
  if (status === 'open') {
    statusFilter = sql`AND t.status IN ('open', 'in_progress')`;
  } else if (status === 'closed') {
    statusFilter = sql`AND t.status IN ('closed', 'archived')`;
  } else {
    statusFilter = empty;  // all — no filter
  }

  const tickets = await prisma.$queryRaw<Array<{
    id: string;
    status: string;
    category_name: string;
    address: string;
    lat: number;
    lng: number;
  }>>`
    SELECT
      t.id,
      t.status::text    AS status,
      c.name            AS category_name,
      LEFT(t.address, 80) AS address,
      t.lat,
      t.lng
    FROM "Ticket" t
    JOIN "Category" c ON t.category_id = c.id
    WHERE t.lat IS NOT NULL
      AND t.lng IS NOT NULL
      AND t.created_at >= ${startDate}
      AND t.created_at <= ${endDate}
      ${statusFilter}
    LIMIT 5000
  `;

  type TicketRow = { id: string; status: string; category_name: string; address: string; lat: number; lng: number };
  const featureCollection = {
    type: 'FeatureCollection' as const,
    features: tickets.map((t: TicketRow) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [t.lng, t.lat], // GeoJSON RFC 7946: [lng, lat]
      },
      properties: {
        ticket_id: t.id,
        status: t.status,
        category_name: t.category_name,
        address_snippet: t.address,
      },
    })),
  };

  return NextResponse.json(featureCollection, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
