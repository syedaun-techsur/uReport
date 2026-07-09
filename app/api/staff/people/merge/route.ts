// app/api/staff/people/merge/route.ts
// POST /api/staff/people/merge — atomically merge two Person records
// CRM-05: re-points all TicketPerson rows from source to target; soft-deletes source
// Next.js 15 App Router route handler

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireSession, ok, apiError } from '@/lib/api-response';

const MergePersonSchema = z.object({
  source_id: z.string().cuid(),
  target_id: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  const sessionOrError = await requireSession('staff');
  if (sessionOrError instanceof NextResponse) return sessionOrError;
  const session = sessionOrError;

  const body = await request.json();
  const parsed = MergePersonSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid input', 422, parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  const { source_id, target_id } = parsed.data;

  // Cannot merge with self
  if (source_id === target_id) {
    return apiError('MERGE_SAME', 'Source and target must be different people', 422);
  }

  // Load both persons — only non-deleted records
  const [source, target] = await Promise.all([
    prisma.person.findFirst({ where: { id: source_id, deleted_at: null } }),
    prisma.person.findFirst({ where: { id: target_id, deleted_at: null } }),
  ]);

  if (!source) return apiError('NOT_FOUND', 'Source person not found', 404);
  if (!target) return apiError('NOT_FOUND', 'Target person not found', 404);
  if (source.anonymized_at) return apiError('PERSON_ANONYMIZED', 'Cannot merge an anonymized record', 422);
  if (target.anonymized_at) return apiError('PERSON_ANONYMIZED', 'Cannot merge into an anonymized record', 422);

  // Get all TicketPerson rows for source
  const sourceTicketPersons = await prisma.ticketPerson.findMany({
    where: { person_id: source_id },
    select: { id: true, ticket_id: true, person_id: true, role: true },
  });

  // Find which tickets target is already linked to (avoid @@unique([ticket_id, person_id]) violation)
  const existingTargetLinks = await prisma.ticketPerson.findMany({
    where: { person_id: target_id },
    select: { ticket_id: true },
  });
  const existingTargetTicketIds = new Set(existingTargetLinks.map((l) => l.ticket_id));

  // TicketPersons to migrate (no existing link to target for this ticket)
  const toMigrate = sourceTicketPersons.filter((tp) => !existingTargetTicketIds.has(tp.ticket_id));
  // TicketPersons to delete (source had link to ticket already linked to target — delete duplicate)
  const toDelete = sourceTicketPersons.filter((tp) => existingTargetTicketIds.has(tp.ticket_id));

  // Copy non-null fields from source to target (only where target field is null)
  const fieldUpdates: Record<string, unknown> = {};
  if (!target.name && source.name) fieldUpdates.name = source.name;
  if (!target.email && source.email) fieldUpdates.email = source.email;
  if (!target.phone && source.phone) fieldUpdates.phone = source.phone;
  if (!target.notes && source.notes) fieldUpdates.notes = source.notes;

  // Build fully atomic transaction
  const ops = [
    // Re-point migrating TicketPerson rows to target
    ...toMigrate.map((tp) =>
      prisma.ticketPerson.update({
        where: { id: tp.id },
        data: { person_id: target_id },
      })
    ),
    // Delete duplicate TicketPerson rows
    ...toDelete.map((tp) =>
      prisma.ticketPerson.delete({ where: { id: tp.id } })
    ),
    // Update target with copied fields (if any)
    ...(Object.keys(fieldUpdates).length > 0
      ? [prisma.person.update({ where: { id: target_id }, data: fieldUpdates })]
      : []),
    // Soft-delete source with merged_into_id
    prisma.person.update({
      where: { id: source_id },
      data: {
        deleted_at: new Date(),
        merged_into_id: target_id,
      },
    }),
    // TicketHistory audit entries on all migrated tickets
    ...toMigrate.map((tp) =>
      prisma.ticketHistory.create({
        data: {
          ticket_id: tp.ticket_id,
          actor_id: session.user.id,
          action: 'PERSON_LINKED',
          note: `Person records merged by ${session.user.username}`,
        },
      })
    ),
  ];

  await prisma.$transaction(ops);

  return ok({
    target_person_id: target_id,
    tickets_relinked: toMigrate.length,
  });
}
