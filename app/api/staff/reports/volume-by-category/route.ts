import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/api-response';
import { VolumeQuerySchema } from '@/schemas/reports';
import { resolveDateRange, shapeVolumeRows } from '@/lib/reports';
import { Prisma } from '@prisma/client';

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
  // Embed the interval as a SQL literal (not a bound parameter). Interpolating
  // ${trunc} as a $queryRaw value emits a placeholder ($1 in SELECT, $N in
  // GROUP BY); Postgres then treats date_trunc($1,col) and date_trunc($N,col)
  // as non-equivalent expressions and rejects with 42803 ("must appear in the
  // GROUP BY clause"). Using the same Prisma.raw fragment in both spots yields
  // identical SQL. Safe from injection: `interval` is a validated z.enum.
  const periodExpr = Prisma.raw(`date_trunc('${trunc}', t.created_at)`);

  const rows = await prisma.$queryRaw<Array<{ period: Date; id: string; name: string; count: bigint }>>`
    SELECT
      ${periodExpr} AS period,
      c.id          AS id,
      c.name        AS name,
      COUNT(*)::bigint AS count
    FROM "Ticket" t
    JOIN "Category" c ON t.category_id = c.id
    WHERE t.created_at >= ${startDate} AND t.created_at <= ${endDate}
    GROUP BY ${periodExpr}, c.id, c.name
    ORDER BY period ASC, name ASC
  `;

  const data = shapeVolumeRows(rows).map(r => ({
    period: r.period,
    category_id: r.id,
    category_name: r.name,
    count: r.count,
  }));

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
