// middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Guard /staff/** and /admin/**
  if (pathname.startsWith('/staff/') || pathname.startsWith('/admin/')) {
    if (!session) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Staff trying to access admin routes
    if (pathname.startsWith('/admin/') && session.user.role !== 'admin') {
      return NextResponse.redirect(new URL('/staff/tickets', req.url));
    }
  }

  // Guard /api/staff/** and /api/admin/** (Route Handlers check independently too)
  if (pathname.startsWith('/api/staff/') || pathname.startsWith('/api/admin/')) {
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }
    if (pathname.startsWith('/api/admin/') && session.user.role !== 'admin') {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
    }
  }
});

export const config = {
  matcher: ['/staff/:path*', '/admin/:path*', '/api/staff/:path*', '/api/admin/:path*'],
};
