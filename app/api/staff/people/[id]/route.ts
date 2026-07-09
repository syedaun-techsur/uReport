// app/api/staff/people/[id]/route.ts
// GET  /api/staff/people/[id] — Person detail with linked tickets (CRM-02)
// PATCH /api/staff/people/[id] — Update person contact details (CRM-04)
// T-06-14: requireSession('staff') as first operation
// T-06-15: Anonymized persons return null for all PII fields
// Next.js 15: params typed as Promise<{ id: string }>

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { UpdatePersonSchema } from '@/schemas/person';

// ─── GET /api/staff/people/[id] — Person detail ──────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // T-06-14: Auth guard — first operation
  const sessionOrError = await requireSession('staff');
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id } = await params;

  const person = await prisma.person.findFirst({
    where: { id, deleted_at: null },
    include: {
      tickets: {
        include: {
          ticket: {
            include: {
              category: { select: { name: true } },
              department: { select: { name: true } },
              substatus: { select: { label: true } },
              assignee: { select: { username: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!person) {
    return apiError('NOT_FOUND', 'Person not found', 404);
  }

  const isAnonymized = !!person.anonymized_at;

  // T-06-15: Mask PII for anonymized persons
  return ok({
    id: person.id,
    name: isAnonymized ? null : person.name,
    display_name: isAnonymized ? 'Anonymous Constituent' : (person.name ?? 'Unknown'),
    email: isAnonymized ? null : person.email,
    phone: isAnonymized ? null : person.phone,
    notes: isAnonymized ? null : person.notes,
    preferred_contact: isAnonymized ? null : person.preferred_contact,
    anonymized_at: person.anonymized_at?.toISOString() ?? null,
    merged_into_id: person.merged_into_id,
    created_at: person.created_at.toISOString(),
    updated_at: person.updated_at.toISOString(),
    linked_tickets: person.tickets.map((tp) => ({
      link_id: tp.id,
      role: tp.role,
      linked_at: tp.created_at.toISOString(),
      ticket: {
        id: tp.ticket.id,
        reference_id: tp.ticket.reference_id,
        address: tp.ticket.address,
        status: tp.ticket.status,
        category_name: tp.ticket.category.name,
        department_name: tp.ticket.department?.name ?? null,
        substatus_label: tp.ticket.substatus?.label ?? null,
        assignee_name: tp.ticket.assignee?.username ?? null,
        created_at: tp.ticket.created_at.toISOString(),
        updated_at: tp.ticket.updated_at.toISOString(),
      },
    })),
  });
}

// ─── PATCH /api/staff/people/[id] — Update person contact details ─────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // T-06-14: Auth guard — first operation
  const sessionOrError = await requireSession('staff');
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const { id } = await params;

  // Check existence and deleted/anonymized status first
  const existing = await prisma.person.findFirst({
    where: { id, deleted_at: null },
  });

  if (!existing) {
    return apiError('NOT_FOUND', 'Person not found', 404);
  }

  if (existing.anonymized_at) {
    return apiError('ALREADY_ANONYMIZED', 'Cannot edit an anonymized record', 409);
  }

  const body = await request.json();
  const parsed = UpdatePersonSchema.safeParse(body);
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

  const updated = await prisma.person.update({
    where: { id },
    data: parsed.data,
  });

  // Explicit field allowlist — no spread, no deleted_at (T-06-15)
  return ok({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    notes: updated.notes,
    preferred_contact: updated.preferred_contact,
    anonymized_at: updated.anonymized_at?.toISOString() ?? null,
    merged_into_id: updated.merged_into_id,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
  });
}
