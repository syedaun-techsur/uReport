// app/api/staff/bookmarks/route.ts
// GET  /api/staff/bookmarks  — list current user's saved views
// POST /api/staff/bookmarks  — create a new saved view
// FRD §F03 — STAFF-04, STAFF-05
// T-05-09: requireSession('staff') guards all access
// T-05-08: findMany scoped to user_id: session.user.id — no cross-user disclosure

import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-response';
import { ok, apiError } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const CreateBookmarkSchema = z.object({
  name: z.string().min(1).max(100),
  filter_json: z.record(z.unknown()),
});

// ─── GET /api/staff/bookmarks ──────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // T-05-09: Auth guard — called before any DB access
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError as NextResponse; // 401/403
  const session = sessionOrError;

  // T-05-08: scope to current user only
  const bookmarks = await prisma.bookmarkedFilter.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: 'desc' },
  });

  return ok({
    data: bookmarks.map((b) => ({
      id: b.id,
      name: b.name,
      filter_json: b.filter_json,
      created_at: b.created_at.toISOString(),
    })),
  });
}

// ─── POST /api/staff/bookmarks ─────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // T-05-09: Auth guard
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError as NextResponse; // 401/403
  const session = sessionOrError;

  // Validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const parsed = CreateBookmarkSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      'VALIDATION_ERROR',
      'Invalid request body',
      422,
      Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.join(', ') ?? ''])
      )
    );
  }

  // Create bookmark — catch unique constraint violation (P2002) on [user_id, name]
  try {
    const bookmark = await prisma.bookmarkedFilter.create({
      data: {
        user_id: session.user.id,
        name: parsed.data.name,
        filter_json: parsed.data.filter_json as Prisma.InputJsonValue,
      },
    });

    return ok(
      {
        id: bookmark.id,
        name: bookmark.name,
        filter_json: bookmark.filter_json,
        created_at: bookmark.created_at.toISOString(),
      },
      201
    );
  } catch (err: unknown) {
    // Prisma unique constraint violation — duplicate name for same user
    const prismaError = err as { code?: string };
    if (prismaError?.code === 'P2002') {
      return apiError('CONFLICT', 'A saved view with this name already exists', 409);
    }
    throw err;
  }
}
