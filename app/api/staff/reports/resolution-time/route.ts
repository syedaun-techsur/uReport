import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/api-response';
import { ResolutionQuerySchema } from '@/schemas/reports';
import { resolveDateRange, shapeResolutionRows } from '@/lib/reports';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ResolutionQuerySchema.safeParse(params);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid query params';
    const code = msg.includes('366') ? 'DATE_RANGE_TOO_WIDE' : 'DATE_RANGE_INVALID';
    return NextResponse.json({ error: { code, message: msg } }, {
      status: 422,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const { group_by } = parsed.data;
  const { startDate, endDate } = resolveDateRange(parsed.data.start_date, parsed.data.end_date);

  // Find the FIRST STATUS_CHANGE → closed TicketHistory entry per ticket
  // Resolution hours = EXTRACT(EPOCH FROM (close_time - ticket.created_at)) / 3600
  let rows: Array<{ group_id: string; group_name: string; mean_hours: string; median_hours: string; count: bigint }>;

  if (group_by === 'category') {
    rows = await prisma.$queryRaw`
      WITH closed_times AS (
        SELECT
          h.ticket_id,
          MIN(h.created_at) AS closed_at
        FROM "TicketHistory" h
        WHERE h.action = 'STATUS_CHANGE'
          AND h.to_value = 'closed'
        GROUP BY h.ticket_id
      ),
      resolution AS (
        SELECT
          t.category_id                                              AS group_id,
          EXTRACT(EPOCH FROM (ct.closed_at - t.created_at)) / 3600  AS hours
        FROM "Ticket" t
        JOIN closed_times ct ON ct.ticket_id = t.id
        WHERE t.created_at >= ${startDate} AND t.created_at <= ${endDate}
      )
      SELECT
        r.group_id,
        c.name                                       AS group_name,
        AVG(r.hours)                                 AS mean_hours,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.hours) AS median_hours,
        COUNT(*)::bigint                             AS count
      FROM resolution r
      JOIN "Category" c ON c.id = r.group_id
      GROUP BY r.group_id, c.name
      ORDER BY mean_hours DESC
    `;
  } else {
    rows = await prisma.$queryRaw`
      WITH closed_times AS (
        SELECT
          h.ticket_id,
          MIN(h.created_at) AS closed_at
        FROM "TicketHistory" h
        WHERE h.action = 'STATUS_CHANGE'
          AND h.to_value = 'closed'
        GROUP BY h.ticket_id
      ),
      resolution AS (
        SELECT
          COALESCE(t.department_id, 'unassigned')                    AS group_id,
          EXTRACT(EPOCH FROM (ct.closed_at - t.created_at)) / 3600   AS hours
        FROM "Ticket" t
        JOIN closed_times ct ON ct.ticket_id = t.id
        WHERE t.created_at >= ${startDate} AND t.created_at <= ${endDate}
      )
      SELECT
        r.group_id,
        COALESCE(d.name, '(Unassigned)')             AS group_name,
        AVG(r.hours)                                 AS mean_hours,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY r.hours) AS median_hours,
        COUNT(*)::bigint                             AS count
      FROM resolution r
      LEFT JOIN "Department" d ON d.id = r.group_id
      GROUP BY r.group_id, d.name
      ORDER BY mean_hours DESC
    `;
  }

  return NextResponse.json(shapeResolutionRows(rows), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
