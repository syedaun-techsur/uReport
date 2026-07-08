import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [
          { id },
          { reference_id: id },
        ],
      },
      include: {
        category: { select: { id: true, name: true, service_code: true } },
        substatus: { select: { id: true, label: true } },
        responses: {
          where: { is_public: true },
          select: { id: true, body: true, created_at: true },
          orderBy: { created_at: 'asc' },
        },
        // DELIBERATELY omit: persons, assignee, history — PII protection per TechArch §5.2
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Shape the response — no PII fields (allowlist only)
    const response = {
      id: ticket.id,
      reference_id: ticket.reference_id,
      service_code: ticket.service_code,
      status: ticket.status,
      substatus: ticket.substatus?.label ?? null,
      category: ticket.category,
      description: ticket.description,
      address: ticket.address,
      lat: ticket.lat,
      lng: ticket.lng,
      created_at: ticket.created_at.toISOString(),
      updated_at: ticket.updated_at.toISOString(),
      responses: ticket.responses.map((r) => ({
        id: r.id,
        body: r.body,
        created_at: r.created_at.toISOString(),
      })),
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=60' },
    });
  } catch (_err) {
    return NextResponse.json({ error: 'Failed to retrieve ticket' }, { status: 500 });
  }
}
