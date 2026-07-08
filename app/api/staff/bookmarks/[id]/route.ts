// app/api/staff/bookmarks/[id]/route.ts
// GET    /api/staff/bookmarks/[id]  — get a specific saved view
// DELETE /api/staff/bookmarks/[id]  — delete a saved view
// FRD §F03 — STAFF-04, STAFF-05
// T-05-06: IDOR prevention — every query includes user_id: session.user.id in where clause
// T-05-09: requireSession('staff') guards all access

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

// ─── GET /api/staff/bookmarks/[id] ─────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // T-05-09: Auth guard — called before any DB access
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError as NextResponse; // 401/403
  const session = sessionOrError;

  // Next.js 15: params is a Promise — must be awaited
  const { id } = await params;

  // T-05-06: IDOR prevention — scope to current user
  const bookmark = await prisma.bookmarkedFilter.findFirst({
    where: { id, user_id: session.user.id },
  });

  if (!bookmark) {
    return apiError('NOT_FOUND', 'Saved view not found', 404);
  }

  return ok({
    id: bookmark.id,
    name: bookmark.name,
    filter_json: bookmark.filter_json,
    created_at: bookmark.created_at.toISOString(),
  });
}

// ─── DELETE /api/staff/bookmarks/[id] ──────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // T-05-09: Auth guard — called before any DB access
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError as NextResponse; // 401/403
  const session = sessionOrError;

  // Next.js 15: params is a Promise — must be awaited
  const { id } = await params;

  // T-05-06: IDOR prevention — find + verify ownership before deleting
  const bookmark = await prisma.bookmarkedFilter.findFirst({
    where: { id, user_id: session.user.id },
  });

  if (!bookmark) {
    return apiError('NOT_FOUND', 'Saved view not found', 404);
  }

  await prisma.bookmarkedFilter.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
