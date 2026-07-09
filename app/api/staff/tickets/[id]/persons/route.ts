// app/api/staff/tickets/[id]/persons/route.ts
// POST /api/staff/tickets/[id]/persons — Link a Person to a ticket (CRM-03)
// T-06-14: requireSession('staff') as first operation
// T-06-16: Cannot link anonymized person (422 PERSON_ANONYMIZED)
// Transaction: TicketPerson + TicketHistory(PERSON_LINKED) atomically created
// Next.js 15: params typed as Promise<{ id: string }>

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { LinkPersonSchema } from '@/schemas/person';
import { Prisma } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // T-06-14: Auth guard — first operation
  const sessionOrError = await requireSession('staff');
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id: ticketId } = await params;

  const body = await request.json();
  const parsed = LinkPersonSchema.safeParse(body);
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
  const { person_id, role } = parsed.data;

  // Verify ticket exists
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return apiError('NOT_FOUND', 'Ticket not found', 404);

  // Verify person exists and is not anonymized
  const person = await prisma.person.findFirst({ where: { id: person_id, deleted_at: null } });
  if (!person) return apiError('NOT_FOUND', 'Person not found', 404);
  // T-06-16: Block linking anonymized persons
  if (person.anonymized_at) {
    return apiError('PERSON_ANONYMIZED', 'Cannot link an anonymized person', 422);
  }

  try {
    // Transaction: create TicketPerson + TicketHistory atomically
    const [ticketPerson] = await prisma.$transaction([
      prisma.ticketPerson.create({
        data: { ticket_id: ticketId, person_id, role },
      }),
      prisma.ticketHistory.create({
        data: {
          ticket_id: ticketId,
          actor_id: session.user.id,
          action: 'PERSON_LINKED',
          to_value: person_id,
          note: `Person linked as ${role}`,
        },
      }),
    ]);

    return ok(
      {
        id: ticketPerson.id,
        ticket_id: ticketId,
        person_id,
        role,
        created_at: ticketPerson.created_at.toISOString(),
      },
      201
    );
  } catch (error) {
    // P2002: Unique constraint violation — person already linked to this ticket
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return apiError('ALREADY_LINKED', 'Person is already linked to this ticket', 409);
    }
    throw error;
  }
}
