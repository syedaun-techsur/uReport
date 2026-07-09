// schemas/ticket.ts
import { z } from 'zod';

export const CreateTicketSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(5).max(500),
  category_id: z.string().cuid(),
  description: z.string().min(10).max(4000),
  name: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
});

export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

// ─── Staff Ticket Queue ────────────────────────────────────────────────────
// TechArch §4.2 — query params for GET /api/staff/tickets
// FRD §F03: Paginated, filtered, FTS-searchable ticket queue

export const TicketQueueQuerySchema = z.object({
  q: z.string().max(500).optional(),
  category_id: z.string().cuid().optional(),
  department_id: z.string().cuid().optional(),
  status: z.enum(['open', 'in_progress', 'closed', 'archived']).optional(),
  substatus_id: z.string().cuid().optional(),
  assignee_id: z.string().cuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  bbox: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional(),
  sort: z.enum(['created_at', 'updated_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(10).max(100).default(25),
});

export type TicketQueueQuery = z.infer<typeof TicketQueueQuerySchema>;
