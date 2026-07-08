// schemas/open311.ts
import { z } from 'zod';

// POST /api/open311/requests body schema
// Note: 'long' (not 'lng') per GeoReport v2 spec
export const Open311PostRequestSchema = z.object({
  service_code: z.string().min(1).max(50),
  lat: z.coerce.number().min(-90).max(90).optional(),
  long: z.coerce.number().min(-180).max(180).optional(),
  address_string: z.string().max(500).optional(),
  description: z.string().min(10).max(4000),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  api_key: z.string().optional(), // also accepted as X-Api-Key header
}).refine(d => d.lat !== undefined || d.address_string, {
  message: 'lat/long or address_string required',
  path: ['lat'],
});

// GET /api/open311/requests query params schema
// Open311 status: 'open' maps to internal IN('open','in_progress'); 'closed' maps to IN('closed','archived')
export const Open311GetRequestsQuerySchema = z.object({
  service_request_id: z.string().optional(),
  service_code: z.string().optional(),
  status: z.enum(['open', 'closed']).optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  format: z.enum(['json', 'xml']).optional(),
});

export type Open311PostRequest = z.infer<typeof Open311PostRequestSchema>;
export type Open311GetRequestsQuery = z.infer<typeof Open311GetRequestsQuerySchema>;
