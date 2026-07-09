import { NextRequest } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { storeMedia } from '@/lib/media';

// Allowed MIME types for upload
const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_MIME_EXACT = ['application/pdf'];

function isAllowedMime(mimeType: string): boolean {
  return (
    ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) ||
    ALLOWED_MIME_EXACT.includes(mimeType)
  );
}

// ─── POST /api/staff/tickets/[id]/media ────────────────────────────────────

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

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError('INVALID_FORM', 'Request must be multipart/form-data', 400);
  }

  const files = formData.getAll('files') as File[];

  if (files.length === 0) {
    return apiError('MEDIA_REQUIRED', 'At least one file is required', 422);
  }

  if (files.length > 5) {
    return apiError('MEDIA_TOO_MANY', 'Maximum 5 files per upload', 422);
  }

  // Validate each file before any DB operations — T-05-17
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      return apiError('MEDIA_TOO_LARGE', 'File exceeds 10MB limit', 422);
    }
    if (!isAllowedMime(file.type)) {
      return apiError('MEDIA_TYPE_INVALID', 'File type not accepted', 422);
    }
  }

  // T-05-15: All mutations in a single Prisma transaction — storeMedia + TicketHistory + ticket update
  // Note: storeMedia creates the Media record; we call it within the transaction callback
  const createdMedia = await prisma.$transaction(async (tx) => {
    const mediaResults = [];

    for (const file of files) {
      // storeMedia uses the prisma client — pass tx (the transaction client)
      const media = await storeMedia(tx as Parameters<typeof storeMedia>[0], ticketId, file);
      mediaResults.push(media);
    }

    await tx.ticketHistory.create({
      data: {
        ticket_id: ticketId,
        actor_id: session.user.id,
        action: 'MEDIA_ADDED',
        from_value: null,
        to_value: files.map((f) => f.name).join(', '),
      },
    });

    await tx.ticket.update({
      where: { id: ticketId },
      data: { updated_at: new Date() },
    });

    return mediaResults;
  });

  return ok(
    {
      media: createdMedia.map((m) => ({
        media_id: m.id,
        filename: m.filename,
        mime_type: m.mime_type,
        created_at: m.created_at,
      })),
    },
    201
  );
}
