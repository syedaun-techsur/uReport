// app/api/staff/people/route.ts
// GET /api/staff/people  — Postgres FTS person search (CRM-01)
// POST /api/staff/people — Create new Person record (CRM-04)
// T-06-14: requireSession('staff') as first operation in every handler
// T-06-18: FTS uses Prisma.$queryRaw with template literals — no string interpolation
// T-06-19: Both endpoints protected by staff auth

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { PersonSearchSchema, CreatePersonSchema } from '@/schemas/person';

// ─── GET /api/staff/people — Person search via Postgres FTS ──────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // T-06-14: Auth guard — first operation
  const sessionOrError = await requireSession('staff');
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { searchParams } = request.nextUrl;
  const parsed = PersonSearchSchema.safeParse({
    q: searchParams.get('q'),
    page: searchParams.get('page'),
    page_size: searchParams.get('page_size'),
  });
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid query', 422);
  }
  const { q, page, page_size } = parsed.data;

  // T-06-18: Use Postgres FTS against person_search_vector tsvector column
  // 'simple' dictionary preserves email/phone digits (no stemming)
  const skip = (page - 1) * page_size;

  const [people, total] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        anonymized_at: Date | null;
        ticket_count: bigint;
      }>
    >`
      SELECT p.id, p.name, p.email, p.phone, p.anonymized_at,
             COUNT(tp.id) AS ticket_count
      FROM "Person" p
      LEFT JOIN "TicketPerson" tp ON tp.person_id = p.id
      WHERE p.deleted_at IS NULL
        AND p.person_search_vector @@ plainto_tsquery('simple', ${q})
      GROUP BY p.id
      ORDER BY ts_rank(p.person_search_vector, plainto_tsquery('simple', ${q})) DESC
      LIMIT ${page_size} OFFSET ${skip}
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "Person"
      WHERE deleted_at IS NULL
        AND person_search_vector @@ plainto_tsquery('simple', ${q})
    `,
  ]);

  const totalCount = Number(total[0]?.count ?? 0);

  return ok({
    data: people.map((p) => ({
      id: p.id,
      // T-06-15: Anonymized persons — mask PII fields
      name: p.anonymized_at ? null : p.name,
      email: p.anonymized_at ? null : p.email,
      phone: p.anonymized_at ? null : p.phone,
      anonymized_at: p.anonymized_at?.toISOString() ?? null,
      ticket_count: Number(p.ticket_count),
    })),
    meta: {
      total: totalCount,
      page,
      page_size,
      total_pages: Math.ceil(totalCount / page_size),
    },
  });
}

// ─── POST /api/staff/people — Create a new Person ────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // T-06-14: Auth guard — first operation
  const sessionOrError = await requireSession('staff');
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const body = await request.json();
  const parsed = CreatePersonSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid input',
      422,
      Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.join(', ') ?? ''])
      )
    );
  }

  const { name, email, phone, notes, preferred_contact } = parsed.data;

  const person = await prisma.person.create({
    data: {
      name: name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      notes: notes ?? null,
      preferred_contact: preferred_contact ?? null,
    },
  });

  // Explicit field allowlist — no deleted_at, no spread operator (T-06-15)
  return ok(
    {
      id: person.id,
      name: person.name,
      email: person.email,
      phone: person.phone,
      notes: person.notes,
      preferred_contact: person.preferred_contact,
      anonymized_at: person.anonymized_at?.toISOString() ?? null,
      created_at: person.created_at.toISOString(),
      updated_at: person.updated_at.toISOString(),
    },
    201
  );
}
