// app/api/tickets/route.ts
// POST /api/tickets  [PUBLIC]  201 { ticket_id, reference_id, status, category_name, created_at }
// TechArch §4.3
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import { storeMedia } from '@/lib/media';
import { CreateTicketSchema } from '@/schemas/ticket';

export async function POST(request: NextRequest) {
  try {
    // ── Parse multipart/form-data ─────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
    }

    const rawLat = formData.get('lat');
    const rawLng = formData.get('lng');
    const rawAddress = formData.get('address');
    const category_id = formData.get('category_id');
    const description = formData.get('description');
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    const photoFile = formData.get('photo');

    // Parse lat/lng as numbers
    const lat = rawLat !== null ? parseFloat(String(rawLat)) : NaN;
    const lng = rawLng !== null ? parseFloat(String(rawLng)) : NaN;

    // Resolve address: use lat,lng as fallback when blank
    const addressStr = rawAddress ? String(rawAddress).trim() : '';
    const resolvedAddress =
      addressStr.length >= 5
        ? addressStr
        : !isNaN(lat) && !isNaN(lng)
          ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          : addressStr;

    // ── Validate ──────────────────────────────────────────────────────────
    const parsed = CreateTicketSchema.safeParse({
      lat,
      lng,
      address: resolvedAddress,
      category_id: category_id !== null ? String(category_id) : undefined,
      description: description !== null ? String(description) : undefined,
      name: name !== null ? String(name) : undefined,
      email: email !== null ? String(email) : undefined,
      phone: phone !== null ? String(phone) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      lat: validLat,
      lng: validLng,
      address,
      category_id: validCategoryId,
      description: validDescription,
      name: validName,
      email: validEmail,
      phone: validPhone,
    } = parsed.data;

    // ── Fetch category ────────────────────────────────────────────────────
    const category = await prisma.category.findUnique({
      where: { id: validCategoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 400 });
    }

    // ── Anon check ────────────────────────────────────────────────────────
    if (!category.anon_allowed && !validName && !validEmail) {
      return NextResponse.json(
        { error: 'Contact information required for this category' },
        { status: 400 },
      );
    }

    // ── Create Ticket ─────────────────────────────────────────────────────
    const ticket = await prisma.ticket.create({
      data: {
        service_code: category.service_code,
        description: validDescription,
        address,
        lat: validLat,
        lng: validLng,
        category_id: validCategoryId,
        department_id: category.department_id ?? null,
      },
    });

    // ── Create Person + TicketPerson (submitter) if contact info provided ─
    if (validName || validEmail || validPhone) {
      const person = await prisma.person.create({
        data: {
          name: validName ?? null,
          email: validEmail ?? null,
          phone: validPhone ?? null,
        },
      });
      await prisma.ticketPerson.create({
        data: {
          ticket_id: ticket.id,
          person_id: person.id,
          role: 'submitter',
        },
      });
    }

    // ── Store photo (bytea or LO, no filesystem write) ────────────────────
    if (photoFile && photoFile instanceof File && photoFile.size > 0) {
      try {
        await storeMedia(prisma, ticket.id, photoFile);
      } catch (mediaErr) {
        log.error({ msg: 'storeMedia failed', ticket_id: ticket.id, err: String(mediaErr) });
        // Non-fatal: ticket is already created; media failure should not block submission
      }
    }

    // ── Respond 201 with allowlisted fields only (no PII) ─────────────────
    return NextResponse.json(
      {
        ticket_id: ticket.id,
        reference_id: ticket.reference_id,
        status: ticket.status,
        category_name: category.name,
        created_at: ticket.created_at.toISOString(),
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    log.error({ msg: 'POST /api/tickets unexpected error', err: String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
