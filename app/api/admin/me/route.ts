// app/api/admin/me/route.ts
// GET /api/admin/me — returns the current admin session user id
// Used by the admin UI to identify the current user (e.g. disable self-deactivation button)

import { NextResponse } from 'next/server';
import { requireSession, ok } from '@/lib/api-response';

export async function GET(): Promise<NextResponse> {
  const session = await requireSession('admin');
  if (session instanceof NextResponse) return session;

  return ok({
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
  });
}
