// app/api/staff/people/[id]/anonymize/route.ts
// PATCH /api/staff/people/[id]/anonymize — irreversibly anonymize a Person record (GDPR erasure)
// CRM-05: nulls name/email/phone/notes, sets anonymized_at; creates TicketHistory audit entries
// Next.js 15 App Router route handler — async params

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, apiError } from '@/lib/api-response';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrError = await requireSession('staff');
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;

  // Load person — only non-deleted records
  const person = await prisma.person.findFirst({ where: { id, deleted_at: null } });
  if (!person) return apiError('NOT_FOUND', 'Person not found', 404);

  // Cannot re-anonymize
  if (person.anonymized_at) {
    return apiError('ALREADY_ANONYMIZED', 'This record has already been anonymized', 409);
  }

  // Merged persons cannot be anonymized (they are soft-deleted, already filtered above by deleted_at: null)
  // If merged_into_id is set but deleted_at is null that's a data inconsistency — treat as normal person
  // (The primary guard is deleted_at: null above)

  // Find all tickets linked to this person (before transaction for TicketHistory creates)
  const ticketLinks = await prisma.ticketPerson.findMany({
    where: { person_id: id },
    select: { ticket_id: true },
  });

  // Atomic transaction: null PII + set anonymized_at + audit TicketHistory entries
  await prisma.$transaction([
    prisma.person.update({
      where: { id },
      data: {
        name: null,
        email: null,
        phone: null,
        notes: null,
        anonymized_at: new Date(),
      },
    }),
    ...ticketLinks.map((tp) =>
      prisma.ticketHistory.create({
        data: {
          ticket_id: tp.ticket_id,
          actor_id: session.user.id,
          action: 'PERSON_ANONYMIZED',
          note: `Person record anonymized by ${session.user.username}`,
        },
      })
    ),
  ]);

  return new NextResponse(null, { status: 204 });
}
