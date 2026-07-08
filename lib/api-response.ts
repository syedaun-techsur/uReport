// lib/api-response.ts
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';

// Standard success response
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// Standard error response — never log PII in error messages
export function apiError(
  code: string,
  message: string,
  status: number,
  fieldErrors?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: { code, message, ...(fieldErrors ? { field_errors: fieldErrors } : {}) } },
    { status }
  );
}

// Auth guard helper — used in route handlers (not middleware).
// TechArch §4.6: requireSession checks session then role.
// Returns Session on success; returns NextResponse on failure (caller must return it).
export async function requireSession(
  role: 'staff' | 'admin' = 'staff'
): Promise<Session | NextResponse> {
  const session = await auth();
  if (!session) return apiError('UNAUTHORIZED', 'Authentication required', 401);
  if (role === 'admin' && session.user.role !== 'admin') {
    return apiError('FORBIDDEN', 'Admin access required', 403);
  }
  return session;
}
