// app/api/health/ready/route.ts
// K8s readiness probe: /api/health/ready
// Returns 200 only when DB is reachable and migrations are applied.
// K8s will not route traffic until this returns 200.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ready',
      db: 'connected',
      migrations: 'applied',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'not_ready', error: 'Database connection failed' },
      { status: 503 }
    );
  }
}
