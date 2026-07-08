// app/api/media/[id]/route.ts
// GET /api/media/[id]  [PUBLIC]  200 binary stream
// TechArch §4.3
//
// Media IDs are CUID2 (unguessable 24-char random), so no directory listing
// is possible. Authenticated staff restriction is deferred to Phase 5.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readMedia } from '@/lib/media';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { buffer, mimeType, filename } = await readMedia(prisma, id);
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(buffer.length),
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('No Media found') || message.includes('not found')) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to retrieve media' }, { status: 500 });
  }
}
