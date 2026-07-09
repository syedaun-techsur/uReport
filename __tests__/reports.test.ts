// __tests__/reports.test.ts
import { describe, it, expect } from 'vitest';
import { resolveDateRange, shapeVolumeRows, shapeResolutionRows } from '@/lib/reports';
import { DateRangeSchema, VolumeQuerySchema } from '@/schemas/reports';

describe('resolveDateRange', () => {
  it('defaults end to now and start to 30 days ago when both absent', () => {
    const { startDate, endDate } = resolveDateRange(undefined, undefined);
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDays)).toBe(30);
  });
  it('uses provided start and end dates', () => {
    const { startDate, endDate } = resolveDateRange('2026-01-01T00:00:00.000Z', '2026-01-31T00:00:00.000Z');
    expect(startDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(endDate.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});

describe('DateRangeSchema', () => {
  it('rejects start_date > end_date', () => {
    const result = DateRangeSchema.safeParse({ start_date: '2026-02-01T00:00:00.000Z', end_date: '2026-01-01T00:00:00.000Z' });
    expect(result.success).toBe(false);
  });
  it('rejects range > 366 days', () => {
    const result = DateRangeSchema.safeParse({ start_date: '2025-01-01T00:00:00.000Z', end_date: '2026-02-01T00:00:00.000Z' });
    expect(result.success).toBe(false);
  });
  it('accepts valid 30-day range', () => {
    const result = DateRangeSchema.safeParse({ start_date: '2026-01-01T00:00:00.000Z', end_date: '2026-01-31T00:00:00.000Z' });
    expect(result.success).toBe(true);
  });
  it('accepts missing dates (optional)', () => {
    expect(DateRangeSchema.safeParse({}).success).toBe(true);
  });
});

describe('shapeVolumeRows', () => {
  it('converts bigint count to number', () => {
    const shaped = shapeVolumeRows([{ period: new Date('2026-01-01'), id: 'abc', name: 'Pothole', count: BigInt(14) }]);
    expect(shaped[0].count).toBe(14);
    expect(typeof shaped[0].count).toBe('number');
  });
  it('formats period as YYYY-MM-DD', () => {
    const shaped = shapeVolumeRows([{ period: new Date('2026-07-01T00:00:00Z'), id: 'x', name: 'Y', count: 1 }]);
    expect(shaped[0].period).toBe('2026-07-01');
  });
});

describe('shapeResolutionRows', () => {
  it('rounds mean and median to 1 decimal', () => {
    const shaped = shapeResolutionRows([{ group_id: 'g1', group_name: 'Streets', mean_hours: '48.234', median_hours: '36.789', count: BigInt(87) }]);
    expect(shaped[0].mean_hours).toBe(48.2);
    expect(shaped[0].median_hours).toBe(36.8);
    expect(shaped[0].count).toBe(87);
  });
});

describe('VolumeQuerySchema', () => {
  it('defaults interval to day', () => {
    const result = VolumeQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.interval).toBe('day');
  });
  it('rejects unknown interval', () => {
    expect(VolumeQuerySchema.safeParse({ interval: 'quarter' }).success).toBe(false);
  });
});
