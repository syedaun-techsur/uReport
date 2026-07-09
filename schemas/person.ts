// schemas/person.ts
// Zod schemas for Person CRM operations
// CRM-01: Person search, CRM-04: Create/edit person, CRM-03: Link/unlink to ticket

import { z } from 'zod';

export const PersonSearchSchema = z.object({
  q: z.string().min(2, 'Minimum 2 characters').max(200),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(20),
});

export const CreatePersonSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  preferred_contact: z.enum(['email', 'phone', 'none']).optional().nullable(),
});

export const UpdatePersonSchema = CreatePersonSchema.partial();

export const LinkPersonSchema = z.object({
  person_id: z.string().cuid(),
  role: z.enum(['submitter', 'contact']),
});

export type PersonSearchInput = z.infer<typeof PersonSearchSchema>;
export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
export type LinkPersonInput = z.infer<typeof LinkPersonSchema>;
