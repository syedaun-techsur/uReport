import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/api-response';
import { VolumeQuerySchema } from '@/schemas/reports';
import { resolveDateRange, shapeVolumeRows } from '@/lib/reports';
import { raw } from '@prisma/client/runtime/library';

export async function GET(req: NextRequest) {
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = VolumeQuerySchema.safeParse(params);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid query params';
    const code = msg.includes('366') ? 'DATE_RANGE_TOO_WIDE' : 'DATE_RANGE_INVALID';
    return NextResponse.json({ error: { code, message: msg } }, {
      status: 422,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const { interval } = parsed.data;
  const { startDate, endDate } = resolveDateRange(parsed.data.start_date, parsed.data.end_date);
  const trunc = interval as 'day' | 'week' | 'month';
  // Embed the interval as a SQL literal, not a bound parameter — otherwise the
  // two ${trunc} placeholders differ ($1 vs $N) and Postgres rejects the
  // GROUP BY with 42803. Same Prisma.raw fragment in SELECT + GROUP BY yields
  // identical SQL. Safe: `interval` is a validated z.enum.
  const periodExpr = raw(`date_trunc('${trunc}', t.created_at)`);

  const rows = await prisma.$queryRaw<Array<{ period: Date; id: string; name: string; count: bigint }>>`
    SELECT
      ${periodExpr}                              AS period,
      COALESCE(d.id, 'unassigned')               AS id,
      COALESCE(d.name, '(Unassigned)')           AS name,
      COUNT(*)::bigint                           AS count
    FROM "Ticket" t
    LEFT JOIN "Department" d ON t.department_id = d.id
    WHERE t.created_at >= ${startDate} AND t.created_at <= ${endDate}
    GROUP BY ${periodExpr}, d.id, d.name
    ORDER BY period ASC, name ASC
  `;

  const data = shapeVolumeRows(rows).map(r => ({
    period: r.period,
    department_id: r.id,
    department_name: r.name,
    count: r.count,
  }));

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
