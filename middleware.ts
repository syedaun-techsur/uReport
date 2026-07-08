// middleware.ts
// MUST run in Node.js runtime — auth.ts calls Prisma (Node.js TCP) for
// token_version invalidation inside the jwt() callback. The Edge Runtime
// does not support Node.js TCP sockets (PrismaClient). Running in 'nodejs'
// gives full Node.js access while still intercepting all matched routes.
export const runtime = 'nodejs';

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Redirect to a same-origin path from middleware, proxy-safely.
//
// We cannot use an HTTP redirect here: Next.js middleware rejects a *relative*
// Location (`ERR_INVALID_URL`), and an *absolute* one would embed the dev
// server's internal host — the Pivota preview proxy strips the `Host` header and
// forwards no `x-forwarded-host`, so the app only ever sees `0.0.0.0`/`127.0.0.1`,
// which the browser can't reach ("0.0.0.0 refused to connect" / blank page).
//
// Instead we return a tiny HTML document that performs a CLIENT-SIDE relative
// navigation. The browser resolves the relative path against its real address-bar
// origin (the preview host), so it always lands correctly. `path` is already
// URL-encoded by callers, so it is safe to inline.
function redirect(path: string) {
  const target = JSON.stringify(path);
  const html =
    `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${path}">` +
    `<script>location.replace(${target})</script></head>` +
    `<body>Redirecting…</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Guard /staff and /admin — bare AND nested. `/admin/:path*` alone missed the
  // bare `/admin`, which then 404'd before the guard could redirect a staff user.
  const isStaffArea = pathname === '/staff' || pathname.startsWith('/staff/');
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isStaffArea || isAdminArea) {
    if (!session) {
      return redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
    // Staff trying to reach admin routes → back to their console (not a 404)
    if (isAdminArea && session.user.role !== 'admin') {
      return redirect('/staff/tickets');
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
  matcher: ['/staff', '/staff/:path*', '/admin', '/admin/:path*', '/api/staff/:path*', '/api/admin/:path*'],
};
