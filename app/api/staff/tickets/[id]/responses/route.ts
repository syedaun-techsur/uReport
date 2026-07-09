import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// ─── Validation Schema ─────────────────────────────────────────────────────

const CreateResponseSchema = z.object({
  body: z
    .string()
    .min(1)
    .max(10000)
    .refine((s) => s.trim().length > 0, { message: 'Response body cannot be empty' }),
  is_public: z.boolean(),
  template_id: z.string().cuid().optional(),
});

// ─── POST /api/staff/tickets/[id]/responses ────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // T-05-19: requireSession before any DB access
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;
  const session = sessionOrError;

  const { id: ticketId } = await params;

  // Verify ticket exists
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });
  if (!ticket) {
    return apiError('NOT_FOUND', 'Ticket not found', 404);
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = CreateResponseSchema.safeParse(body);
  if (!parsed.success) {
    // Check if it's specifically an empty body error
    const emptyBodyError = parsed.error.errors.find(
      (e) => e.message === 'Response body cannot be empty'
    );
    if (emptyBodyError) {
      return apiError('EMPTY_RESPONSE', 'Response body cannot be empty', 422);
    }
    return apiError('VALIDATION_ERROR', 'Invalid request body', 422);
  }

  // T-05-15: All mutations in a single Prisma transaction — no partial writes
  const [response] = await prisma.$transaction([
    prisma.response.create({
      data: {
        ticket_id: ticketId,
        author_id: session.user.id,
        body: parsed.data.body,
        is_public: parsed.data.is_public,
        template_id: parsed.data.template_id ?? null,
      },
    }),
    prisma.ticketHistory.create({
      data: {
        ticket_id: ticketId,
        actor_id: session.user.id,
        action: 'RESPONSE',
        from_value: null,
        to_value: parsed.data.is_public ? 'public' : 'internal',
        note: parsed.data.body.slice(0, 200),
      },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: { updated_at: new Date() },
    }),
  ]);

  return ok(
    {
      response_id: response.id,
      body: response.body,
      is_public: response.is_public,
      created_at: response.created_at.toISOString(),
    },
    201
  );
}
