// schemas/admin.ts
import { z } from 'zod';

// ─── Category ────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  service_code: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric and underscores'),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  icon: z.string().max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be #RRGGBB')
    .optional()
    .nullable(),
  anon_allowed: z.boolean().default(true),
  active: z.boolean().default(true),
  group_id: z.string().cuid().optional().nullable(),
  department_id: z.string().cuid().optional().nullable(),
  // sla_hours: NOT in Prisma schema — kept in Zod for API compat, silently ignored in DB writes
  sla_hours: z.number().int().positive().optional().nullable(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// ─── Department ──────────────────────────────────────────────────────────────

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(200),
  default_assignee_id: z.string().cuid().optional().nullable(),
  active: z.boolean().default(true),
});

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial();

export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;

// ─── Substatus ───────────────────────────────────────────────────────────────

export const CreateSubstatusSchema = z.object({
  label: z.string().min(1).max(100),
  internal_label: z.string().max(100).optional().nullable(),
  status: z.enum(['open', 'in_progress', 'closed', 'archived']),
  sort_order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const UpdateSubstatusSchema = CreateSubstatusSchema.partial();

export const ReorderSubstatusSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().cuid(),
        sort_order: z.number().int().min(0),
      })
    )
    .min(1)
    .max(200),
});

export type CreateSubstatusInput = z.infer<typeof CreateSubstatusSchema>;
export type UpdateSubstatusInput = z.infer<typeof UpdateSubstatusSchema>;
export type ReorderSubstatusInput = z.infer<typeof ReorderSubstatusSchema>;

// ─── ResponseTemplate ────────────────────────────────────────────────────────

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  category_id: z.string().cuid().optional().nullable(),
  department_id: z.string().cuid().optional().nullable(),
  active: z.boolean().default(true),
});

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
