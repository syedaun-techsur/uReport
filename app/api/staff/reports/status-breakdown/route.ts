import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/api-response';
import { DateRangeSchema } from '@/schemas/reports';
import { resolveDateRange } from '@/lib/reports';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = DateRangeSchema.safeParse(params);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid date range';
    const code = msg.includes('366') ? 'DATE_RANGE_TOO_WIDE' : 'DATE_RANGE_INVALID';
    return NextResponse.json({ error: { code, message: msg } }, {
      status: 422,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const { startDate, endDate } = resolveDateRange(parsed.data.start_date, parsed.data.end_date);

  const rows = await prisma.$queryRaw<Array<{ status: string; count: bigint }>>`
    SELECT status::text, COUNT(*)::bigint AS count
    FROM "Ticket"
    WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    GROUP BY status
  `;

  const result = { open: 0, in_progress: 0, closed: 0, archived: 0 };
  for (const row of rows) {
    const key = row.status as keyof typeof result;
    if (key in result) result[key] = Number(row.count);
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
