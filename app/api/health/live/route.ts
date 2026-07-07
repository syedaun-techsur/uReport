// app/api/health/live/route.ts
// K8s liveness probe: /api/health/live
// Returns 200 as long as the Node.js process is running.
// NO database check — this endpoint must always respond fast.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
