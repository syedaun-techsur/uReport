// schemas/reports.ts
import { z } from 'zod';

// Base date range — applied to ALL report endpoints
// start_date defaults to 30 days ago, end_date defaults to today
// Both accept ISO8601 datetime strings (e.g. "2026-01-01T00:00:00.000Z")
export const DateRangeSchema = z.object({
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date:   z.string().datetime({ offset: true }).optional(),
}).refine(
  d => {
    if (!d.start_date || !d.end_date) return true;
    return new Date(d.start_date) <= new Date(d.end_date);
  },
  { message: 'start_date must be before or equal to end_date', path: ['start_date'] }
).refine(
  d => {
    if (!d.start_date || !d.end_date) return true;
    const diffMs = new Date(d.end_date).getTime() - new Date(d.start_date).getTime();
    return diffMs <= 366 * 24 * 60 * 60 * 1000;
  },
  { message: 'Date range cannot exceed 366 days', path: ['end_date'] }
);

export const VolumeQuerySchema = DateRangeSchema.and(z.object({
  interval: z.enum(['day', 'week', 'month']).default('day'),
}));

export const ResolutionQuerySchema = DateRangeSchema.and(z.object({
  group_by: z.enum(['category', 'department']).default('category'),
}));

export const GeoDensityQuerySchema = DateRangeSchema.and(z.object({
  status: z.enum(['open', 'closed', 'all']).default('all'),
}));
