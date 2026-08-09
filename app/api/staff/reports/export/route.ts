// app/api/staff/reports/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/api-response';
import { DateRangeSchema } from '@/schemas/reports';
import { resolveDateRange } from '@/lib/reports';
import { toCsv, type CsvCell } from '@/lib/reports/csv';

interface ExportRow {
  reference_id: string;
  status: string;
  category_name: string | null;
  department_name: string | null;
  address: string | null;
  created_at: Date;
  updated_at: Date;
}

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

  const rows = await prisma.$queryRaw<ExportRow[]>`
    SELECT t.reference_id,
           t.status::text AS status,
           c.name AS category_name,
           d.name AS department_name,
           t.address,
           t.created_at,
           t.updated_at
    FROM "Ticket" t
    LEFT JOIN "Category" c ON c.id = t.category_id
    LEFT JOIN "Department" d ON d.id = t.department_id
    WHERE t.created_at >= ${startDate} AND t.created_at <= ${endDate}
    ORDER BY t.created_at DESC
  `;

  const headers = [
    'reference_id',
    'status',
    'category',
    'department',
    'address',
    'created_at',
    'updated_at',
  ];
  const data: CsvCell[][] = rows.map((r) => [
    r.reference_id,
    r.status,
    r.category_name,
    r.department_name,
    r.address,
    r.created_at.toISOString(),
    r.updated_at.toISOString(),
  ]);

  const csv = toCsv(headers, data);
  const filename = `tickets-${startDate.toISOString().slice(0, 10)}_to_${endDate
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
