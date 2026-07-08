// app/api/staff/account/password/route.ts
// POST /api/staff/account/password — self-service password change for authenticated staff/admin
// Middleware already guards /api/staff/**, so an unauthenticated request never reaches here.
// Route handler also calls requireSession() defensively (defense in depth).
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import { ok, apiError, requireSession } from '@/lib/api-response';
import { PasswordChangeSchema } from '@/schemas/auth';

export async function POST(req: NextRequest) {
  // Defense-in-depth auth check (middleware already guards, but Route Handler must not trust middleware alone)
  const sessionOrError = await requireSession('staff');
  if ('status' in sessionOrError) return sessionOrError; // NextResponse (401/403)
  const session = sessionOrError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  // Validate with Zod
  const parsed = PasswordChangeSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.errors.forEach(e => {
      const field = e.path.join('.');
      fieldErrors[field] = e.message;
    });
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, fieldErrors);
  }

  const { current_password, new_password } = parsed.data;

  // Fetch user with password_hash — must exist since they have a valid session
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password_hash: true, active: true },
  });

  if (!user || !user.active) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  // Verify current password
  const currentPasswordMatch = await bcrypt.compare(current_password, user.password_hash);
  if (!currentPasswordMatch) {
    // Use field_errors to point at the right field
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, {
      current_password: 'Current password is incorrect',
    });
  }

  // Hash new password with work factor 12 (TechArch §5.3)
  const new_password_hash = await bcrypt.hash(new_password, 12);

  // Update password_hash AND increment token_version to invalidate existing JWTs
  // TechArch §5.1: "Admin-initiated password reset: UPDATE "User" SET token_version = token_version + 1"
  // Same invalidation applies to self-service change.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_hash: new_password_hash,
      token_version: { increment: 1 },
    },
  });

  log.info({ event: 'password_changed', userId: user.id });

  return ok({ message: 'Password updated successfully' });
}
