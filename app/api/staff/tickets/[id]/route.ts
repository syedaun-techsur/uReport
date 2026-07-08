import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// ─── Validation Schemas ────────────────────────────────────────────────────

const UpdateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'closed', 'archived']).optional(),
  substatus_id: z.string().cuid().nullable().optional(),
  assignee_id: z.string().cuid().nullable().optional(),
  note: z.string().max(4000).optional(),
  department_id: z.string().cuid().nullable().optional(),
});

// ─── GET /api/staff/tickets/[id] ───────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // T-05-12: requireSession before any DB access
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, service_code: true } },
      department: { select: { id: true, name: true } },
      substatus: { select: { id: true, label: true, internal_label: true, status: true } },
      assignee: { select: { id: true, username: true } },
      history: {
        include: { actor: { select: { id: true, username: true } } },
        orderBy: { created_at: 'asc' },
      },
      responses: {
        include: { author: { select: { id: true, username: true } } },
        orderBy: { created_at: 'asc' },
      },
      media: {
        select: { id: true, filename: true, mime_type: true, size_bytes: true, created_at: true },
        orderBy: { created_at: 'asc' },
      },
      persons: {
        include: { person: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });

  if (!ticket) {
    return apiError('NOT_FOUND', 'Ticket not found', 404);
  }

  // T-05-11: Explicit allowlist — no spread operator, only declared fields returned
  // PII (email/phone) is intentional here: staff endpoint, auth-gated, staff need contact info
  return ok({
    ticket_id: ticket.id,
    reference_id: ticket.reference_id,
    service_code: ticket.service_code,
    description: ticket.description,
    address: ticket.address,
    lat: ticket.lat,
    lng: ticket.lng,
    status: ticket.status,
    category_id: ticket.category_id,
    category_name: ticket.category.name,
    department_id: ticket.department_id,
    department_name: ticket.department?.name ?? null,
    substatus_id: ticket.substatus_id,
    substatus_label: ticket.substatus?.label ?? null,
    assignee_id: ticket.assignee_id,
    assignee_name: ticket.assignee?.username ?? null,
    created_at: ticket.created_at.toISOString(),
    updated_at: ticket.updated_at.toISOString(),
    history: ticket.history.map(h => ({
      id: h.id,
      action: h.action,
      from_value: h.from_value,
      to_value: h.to_value,
      note: h.note,
      actor_name: h.actor?.username ?? null,
      created_at: h.created_at.toISOString(),
    })),
    responses: ticket.responses.map(r => ({
      id: r.id,
      body: r.body,
      is_public: r.is_public,
      author_name: r.author?.username ?? null,
      template_id: r.template_id,
      created_at: r.created_at.toISOString(),
    })),
    media: ticket.media.map(m => ({
      id: m.id,
      filename: m.filename,
      mime_type: m.mime_type,
      size_bytes: m.size_bytes,
      created_at: m.created_at.toISOString(),
    })),
    persons: ticket.persons.map(tp => ({
      person_id: tp.person_id,
      name: tp.person.name,
      email: tp.person.email,
      phone: tp.person.phone,
      role: tp.role,
    })),
  });
}

// ─── PATCH /api/staff/tickets/[id] ─────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // T-05-19: requireSession before any DB access
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError;
  const session = sessionOrError;

  const { id } = await params;

  // Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = UpdateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid request body', 422);
  }

  const { status, substatus_id, assignee_id, note, department_id } = parsed.data;

  // Fetch current ticket state
  const current = await prisma.ticket.findUnique({
    where: { id },
    select: { status: true, assignee_id: true, department_id: true, substatus_id: true },
  });

  if (!current) {
    return apiError('NOT_FOUND', 'Ticket not found', 404);
  }

  // T-05-14: Status transition guard — staff cannot reopen closed tickets
  if (status === 'open' && current.status === 'closed' && session.user.role !== 'admin') {
    return apiError('TRANSITION_FORBIDDEN', 'Only admins can re-open closed tickets', 403);
  }

  // Substatus validation — only if both status and substatus_id are provided and non-null
  if (substatus_id != null && status != null) {
    const validSubstatus = await prisma.substatus.findFirst({
      where: { id: substatus_id, status: status },
    });
    if (!validSubstatus) {
      return apiError('SUBSTATUS_MISMATCH', 'Substatus does not belong to selected status', 422);
    }
  }

  // Build the ticket update data
  const updateData: {
    status?: typeof status;
    substatus_id?: string | null;
    assignee_id?: string | null;
    department_id?: string | null;
    updated_at: Date;
  } = { updated_at: new Date() };

  if (status !== undefined) updateData.status = status;
  if (substatus_id !== undefined) updateData.substatus_id = substatus_id;
  if (assignee_id !== undefined) updateData.assignee_id = assignee_id;
  if (department_id !== undefined) updateData.department_id = department_id;

  // Build history entries for changed fields
  const historyCreates: {
    ticket_id: string;
    actor_id: string;
    action: string;
    from_value: string | null;
    to_value: string | null;
    note?: string;
  }[] = [];

  if (status !== undefined && status !== current.status) {
    historyCreates.push({
      ticket_id: id,
      actor_id: session.user.id,
      action: 'STATUS_CHANGE',
      from_value: current.status,
      to_value: status,
    });
  }

  if (assignee_id !== undefined && assignee_id !== current.assignee_id) {
    historyCreates.push({
      ticket_id: id,
      actor_id: session.user.id,
      action: 'ASSIGNMENT',
      from_value: current.assignee_id ?? null,
      to_value: assignee_id ?? null,
    });
  }

  if (department_id !== undefined && department_id !== current.department_id) {
    historyCreates.push({
      ticket_id: id,
      actor_id: session.user.id,
      action: 'ASSIGNMENT',
      from_value: current.department_id ?? null,
      to_value: department_id ?? null,
      note: 'Department updated',
    });
  }

  // T-05-15: All mutations in a single Prisma transaction — no partial writes
  await prisma.$transaction([
    prisma.ticket.update({ where: { id }, data: updateData }),
    ...historyCreates.map(h => prisma.ticketHistory.create({ data: h })),
    ...(note
      ? [prisma.response.create({
          data: {
            ticket_id: id,
            author_id: session.user.id,
            body: note,
            is_public: false,
          },
        })]
      : []),
  ]);

  // Re-fetch full ticket with all includes (same as GET shape)
  const updated = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, service_code: true } },
      department: { select: { id: true, name: true } },
      substatus: { select: { id: true, label: true, internal_label: true, status: true } },
      assignee: { select: { id: true, username: true } },
      history: {
        include: { actor: { select: { id: true, username: true } } },
        orderBy: { created_at: 'asc' },
      },
      responses: {
        include: { author: { select: { id: true, username: true } } },
        orderBy: { created_at: 'asc' },
      },
      media: {
        select: { id: true, filename: true, mime_type: true, size_bytes: true, created_at: true },
        orderBy: { created_at: 'asc' },
      },
      persons: {
        include: { person: { select: { id: true, name: true, email: true, phone: true } } },
      },
    },
  });

  if (!updated) {
    return apiError('NOT_FOUND', 'Ticket not found after update', 404);
  }

  return ok({
    ticket_id: updated.id,
    reference_id: updated.reference_id,
    service_code: updated.service_code,
    description: updated.description,
    address: updated.address,
    lat: updated.lat,
    lng: updated.lng,
    status: updated.status,
    category_id: updated.category_id,
    category_name: updated.category.name,
    department_id: updated.department_id,
    department_name: updated.department?.name ?? null,
    substatus_id: updated.substatus_id,
    substatus_label: updated.substatus?.label ?? null,
    assignee_id: updated.assignee_id,
    assignee_name: updated.assignee?.username ?? null,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    history: updated.history.map(h => ({
      id: h.id,
      action: h.action,
      from_value: h.from_value,
      to_value: h.to_value,
      note: h.note,
      actor_name: h.actor?.username ?? null,
      created_at: h.created_at.toISOString(),
    })),
    responses: updated.responses.map(r => ({
      id: r.id,
      body: r.body,
      is_public: r.is_public,
      author_name: r.author?.username ?? null,
      template_id: r.template_id,
      created_at: r.created_at.toISOString(),
    })),
    media: updated.media.map(m => ({
      id: m.id,
      filename: m.filename,
      mime_type: m.mime_type,
      size_bytes: m.size_bytes,
      created_at: m.created_at.toISOString(),
    })),
    persons: updated.persons.map(tp => ({
      person_id: tp.person_id,
      name: tp.person.name,
      email: tp.person.email,
      phone: tp.person.phone,
      role: tp.role,
    })),
  });
}
