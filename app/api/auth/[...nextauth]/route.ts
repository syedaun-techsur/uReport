// app/api/auth/[...nextauth]/route.ts
// Auth.js v5 catch-all route handler for:
//   POST /api/auth/[...nextauth] (login)
//   GET  /api/auth/[...nextauth] (signout redirect, CSRF, etc.)
export { GET, POST } from '@/lib/auth';
