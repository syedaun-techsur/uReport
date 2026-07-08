import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['open', 'in_progress'] },
        lat: { not: null },
        lng: { not: null },
      },
      select: {
        id: true,
        reference_id: true,
        lat: true,
        lng: true,
      },
    });

    // GeoJSON FeatureCollection (RFC 7946)
    // coordinates: [longitude, latitude] (GeoJSON spec order)
    const featureCollection = {
      type: 'FeatureCollection' as const,
      features: tickets.map((t) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [t.lng!, t.lat!], // [lng, lat] per GeoJSON spec
        },
        properties: {
          ticket_id: t.id,
          reference_id: t.reference_id,
        },
      })),
    };

    return NextResponse.json(featureCollection, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
        'Content-Type': 'application/geo+json',
      },
    });
  } catch (_err) {
    return NextResponse.json({ error: 'Failed to load map data' }, { status: 500 });
  }
}
