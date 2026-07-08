import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

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
