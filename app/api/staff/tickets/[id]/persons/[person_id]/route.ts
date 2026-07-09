// app/api/staff/tickets/[id]/persons/[person_id]/route.ts
// DELETE /api/staff/tickets/[id]/persons/[person_id] — Unlink Person from ticket (CRM-03)
// T-06-14: requireSession('staff') as first operation
// T-06-17: Staff cannot unlink the original 'submitter' — only admins can (403)
// Transaction: delete TicketPerson + create TicketHistory(PERSON_UNLINKED)
// Next.js 15: params typed as Promise<{ id: string; person_id: string }>

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; person_id: string }> }
): Promise<NextResponse> {
  // T-06-14: Auth guard — first operation
  const sessionOrError = await requireSession('staff');
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const { id: ticketId, person_id } = await params;

  // Load the TicketPerson join record
  const ticketPerson = await prisma.ticketPerson.findFirst({
    where: { ticket_id: ticketId, person_id },
  });

  if (!ticketPerson) {
    return apiError('NOT_FOUND', 'Person is not linked to this ticket', 404);
  }

  // T-06-17: Staff cannot unlink the original submitter — only admins can
  if (ticketPerson.role === 'submitter' && session.user.role !== 'admin') {
    return apiError(
      'UNLINK_SUBMITTER_FORBIDDEN',
      'Only admins can unlink the original submitter',
      403
    );
  }

  // Transaction: delete TicketPerson + create TicketHistory(PERSON_UNLINKED)
  await prisma.$transaction([
    prisma.ticketPerson.delete({
      where: { id: ticketPerson.id },
    }),
    prisma.ticketHistory.create({
      data: {
        ticket_id: ticketId,
        actor_id: session.user.id,
        action: 'PERSON_UNLINKED',
        from_value: person_id,
        note: `Person unlinked (was ${ticketPerson.role})`,
      },
    }),
  ]);

  return new NextResponse(null, { status: 204 });
}
