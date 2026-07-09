// lib/reports.ts
// Pure functions — no Prisma imports here. Imported by route handlers.

/** Returns resolved start/end Date objects with defaults (30d ago / now) */
export function resolveDateRange(
  rawStart: string | undefined,
  rawEnd: string | undefined
): { startDate: Date; endDate: Date } {
  const endDate = rawEnd ? new Date(rawEnd) : new Date();
  const startDate = rawStart
    ? new Date(rawStart)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

/** Shape raw volume rows from $queryRaw into API response format */
export function shapeVolumeRows(
  rows: Array<{ period: Date | string; id: string; name: string; count: bigint | number }>
): Array<{ period: string; id: string; name: string; count: number }> {
  return rows.map(r => ({
    period: r.period instanceof Date ? r.period.toISOString().split('T')[0] : String(r.period),
    id: r.id,
    name: r.name,
    count: Number(r.count),
  }));
}

/** Shape raw resolution time rows — bigint count + numeric mean/median from Postgres */
export function shapeResolutionRows(
  rows: Array<{ group_id: string; group_name: string; mean_hours: number | string; median_hours: number | string; count: bigint | number }>
): Array<{ group_id: string; group_name: string; mean_hours: number; median_hours: number; count: number }> {
  return rows.map(r => ({
    group_id: r.group_id,
    group_name: r.group_name,
    mean_hours: Math.round(Number(r.mean_hours) * 10) / 10,
    median_hours: Math.round(Number(r.median_hours) * 10) / 10,
    count: Number(r.count),
  }));
}
