// app/api/staff/tickets/route.ts
// GET /api/staff/tickets — paginated, filtered, FTS-searchable ticket queue
// TechArch §4.2 / FRD §F03 — Staff-01, Staff-02, Staff-03
// T-05-01: requireSession('staff') guards all access
// T-05-02: FTS uses Prisma.sql parameterized queries (never string interpolation)
// T-05-03: Explicit allowlist response shape (no spread)
// T-05-05: page_size clamped to max 100 by TicketQueueQuerySchema

import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { TicketQueueQuerySchema } from '@/schemas/ticket';
import { buildBboxFilter } from '@/lib/geo';
import { ticketFtsWhere } from '@/lib/fts';
import { Prisma } from '@prisma/client';
import type { TicketStatus } from '@/types/domain';
import { NextResponse } from 'next/server';

// ─── Response types ────────────────────────────────────────────────────────

interface TicketRow {
  ticket_id: string;
  reference_id: string;
  category_name: string;
  department_name: string | null;
  status: TicketStatus;
  substatus_label: string | null;
  assignee_name: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // T-05-01: Auth guard — must be called before any DB access
  // requireSession returns Session on success, NextResponse (401/403) on failure
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError as NextResponse; // 401/403

  // Parse + validate query params
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = TicketQueueQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid query parameters',
      422,
      Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.join(', ') ?? ''])
      )
    );
  }

  const {
    q,
    category_id,
    department_id,
    status,
    substatus_id,
    assignee_id,
    date_from,
    date_to,
    bbox,
    sort,
    order,
    page,
    page_size,
  } = parsed.data;

  // Date range validation
  if (date_from && date_to && new Date(date_from) > new Date(date_to)) {
    return apiError('DATE_RANGE_INVALID', 'date_from must be before date_to', 422);
  }

  const offset = (page - 1) * page_size;

  // ─── FTS path (when q is provided) ────────────────────────────────────────
  if (q) {
    // Build WHERE fragments with Prisma.sql template literals
    // T-05-02: ticketFtsWhere uses parameterized Prisma.sql — safe from injection
    const conditions: Prisma.Sql[] = [ticketFtsWhere(q)];

    if (category_id) {
      conditions.push(Prisma.sql`t.category_id = ${category_id}`);
    }
    if (department_id) {
      conditions.push(Prisma.sql`t.department_id = ${department_id}`);
    }
    if (status) {
      conditions.push(Prisma.sql`t.status = ${status}::"TicketStatus"`);
    }
    if (substatus_id) {
      conditions.push(Prisma.sql`t.substatus_id = ${substatus_id}`);
    }
    if (assignee_id) {
      conditions.push(Prisma.sql`t.assignee_id = ${assignee_id}`);
    }
    if (date_from) {
      conditions.push(Prisma.sql`t.created_at >= ${new Date(date_from)}`);
    }
    if (date_to) {
      conditions.push(Prisma.sql`t.created_at <= ${new Date(date_to)}`);
    }
    if (bbox) {
      const bboxFilter = buildBboxFilter(bbox);
      if (bboxFilter) {
        const bboxObj = bboxFilter as { lat: { gte: number; lte: number }; lng: { gte: number; lte: number } };
        conditions.push(Prisma.sql`t.lat BETWEEN ${bboxObj.lat.gte} AND ${bboxObj.lat.lte}`);
        conditions.push(Prisma.sql`t.lng BETWEEN ${bboxObj.lng.gte} AND ${bboxObj.lng.lte}`);
      }
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

    // Sort column: only 'created_at' or 'updated_at' are allowed by schema
    const sortCol = sort === 'updated_at'
      ? Prisma.sql`t.updated_at`
      : Prisma.sql`t.created_at`;
    const orderDir = order === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<TicketRow[]>`
        SELECT
          t.id             AS ticket_id,
          t.reference_id,
          c.name           AS category_name,
          d.name           AS department_name,
          t.status         AS status,
          s.label          AS substatus_label,
          u.username       AS assignee_name,
          t.address,
          t.lat,
          t.lng,
          t.created_at,
          t.updated_at
        FROM "Ticket" t
        JOIN "Category" c ON c.id = t.category_id
        LEFT JOIN "Department" d ON d.id = t.department_id
        LEFT JOIN "Substatus" s ON s.id = t.substatus_id
        LEFT JOIN "User" u ON u.id = t.assignee_id
        ${whereClause}
        ORDER BY ${sortCol} ${orderDir}
        LIMIT ${page_size} OFFSET ${offset}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) AS count
        FROM "Ticket" t
        ${whereClause}
      `,
    ]);

    const total = Number(countRows[0]?.count ?? 0);

    // T-05-03: Explicit allowlist — no spread operator
    const data = rows.map((r) => ({
      ticket_id: r.ticket_id,
      reference_id: r.reference_id,
      category_name: r.category_name,
      department_name: r.department_name ?? null,
      status: r.status,
      substatus_label: r.substatus_label ?? null,
      assignee_name: r.assignee_name ?? null,
      address: r.address,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
    }));

    return ok({
      data,
      meta: {
        total,
        page,
        page_size,
        total_pages: Math.ceil(total / page_size),
      },
    });
  }

  // ─── Standard path (no FTS — use Prisma findMany) ─────────────────────────
  const where: Prisma.TicketWhereInput = {};

  if (category_id) where.category_id = category_id;
  if (department_id) where.department_id = department_id;
  if (status) where.status = status;
  if (substatus_id) where.substatus_id = substatus_id;
  if (assignee_id) where.assignee_id = assignee_id;

  if (date_from || date_to) {
    where.created_at = {};
    if (date_from) (where.created_at as Prisma.DateTimeFilter).gte = new Date(date_from);
    if (date_to) (where.created_at as Prisma.DateTimeFilter).lte = new Date(date_to);
  }

  if (bbox) {
    const bboxFilter = buildBboxFilter(bbox);
    if (bboxFilter) {
      Object.assign(where, bboxFilter);
    }
  }

  const orderBy: Prisma.TicketOrderByWithRelationInput = {
    [sort]: order,
  };

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy,
      skip: offset,
      take: page_size,
      include: {
        category: { select: { name: true } },
        department: { select: { name: true } },
        substatus: { select: { label: true } },
        assignee: { select: { username: true } },
      },
    }),
    prisma.ticket.count({ where }),
  ]);

  // T-05-03: Explicit allowlist — no spread operator
  const data = tickets.map((t) => ({
    ticket_id: t.id,
    reference_id: t.reference_id,
    category_name: t.category.name,
    department_name: t.department?.name ?? null,
    status: t.status as TicketStatus,
    substatus_label: t.substatus?.label ?? null,
    assignee_name: t.assignee?.username ?? null,
    address: t.address,
    lat: t.lat ?? null,
    lng: t.lng ?? null,
    created_at: t.created_at.toISOString(),
    updated_at: t.updated_at.toISOString(),
  }));

  return ok({
    data,
    meta: {
      total,
      page,
      page_size,
      total_pages: Math.ceil(total / page_size),
    },
  });
}
