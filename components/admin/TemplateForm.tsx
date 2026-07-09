'use client';
// components/admin/TemplateForm.tsx
// Create/edit response template. Uses react-hook-form + Zod resolver.
// Shows placeholder token hints and warns on unknown {{...}} tokens.

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTemplateSchema, UpdateTemplateSchema } from '@/schemas/admin';
import type { CreateTemplateInput } from '@/schemas/admin';

interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  body: string;
  active: boolean;
  category_id?: string | null;
  department_id?: string | null;
}

interface TemplateFormProps {
  template?: Template | null;
  categories: Category[];
  departments: Department[];
  onSuccess: () => void;
  onCancel: () => void;
}

const KNOWN_TOKENS = ['ticket_id', 'reference_id', 'address', 'category_name', 'status', 'assignee_name', 'created_at'];

function detectUnknownTokens(body: string): string[] {
  const matches = body.match(/\{\{([^}]+)\}\}/g) ?? [];
  return matches
    .map((m) => m.replace(/^\{\{|\}\}$/g, '').trim())
    .filter((token) => !KNOWN_TOKENS.includes(token));
}

export function TemplateForm({ template, categories, departments, onSuccess, onCancel }: TemplateFormProps) {
  const isEdit = Boolean(template);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unknownTokens, setUnknownTokens] = useState<string[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const schema = isEdit ? UpdateTemplateSchema : CreateTemplateSchema;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTemplateInput>({
    resolver: zodResolver(schema),
    defaultValues: template
      ? {
          name: template.name,
          body: template.body,
          active: template.active,
          category_id: template.category_id ?? undefined,
          department_id: template.department_id ?? undefined,
        }
      : { active: true },
  });

  const bodyValue = watch('body');

  useEffect(() => {
    if (bodyValue) {
      setUnknownTokens(detectUnknownTokens(bodyValue));
    } else {
      setUnknownTokens([]);
    }
  }, [bodyValue]);

  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        body: template.body,
        active: template.active,
        category_id: template.category_id ?? undefined,
        department_id: template.department_id ?? undefined,
      });
    }
  }, [template, reset]);

  const { ref: hookRef, ...bodyRest } = register('body');

  async function onSubmit(values: CreateTemplateInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/admin/response-templates/${template!.id}`
        : '/api/admin/response-templates';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        setServerError(err?.error?.message ?? 'Failed to save template');
        return;
      }
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tmpl-name">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="tmpl-name"
          {...register('name')}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Template name"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tmpl-body">
          Body <span className="text-red-500">*</span>
        </label>
        <p className="mb-1 text-xs text-gray-500">
          Supported tokens:{' '}
          {KNOWN_TOKENS.map((t) => (
            <code key={t} className="mx-0.5 rounded bg-gray-100 px-1 py-0.5 text-xs">
              {`{{${t}}}`}
            </code>
          ))}
        </p>
        <textarea
          id="tmpl-body"
          {...bodyRest}
          ref={(el) => {
            hookRef(el);
            bodyRef.current = el;
          }}
          rows={8}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          placeholder="Thank you for reporting ticket {{ticket_id}}…"
        />
        {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
        {unknownTokens.length > 0 && (
          <p className="mt-1 text-xs text-orange-600">
            ⚠ Unknown tokens:{' '}
            {unknownTokens.map((t) => (
              <code key={t} className="mx-0.5 rounded bg-orange-50 px-1">
                {`{{${t}}}`}
              </code>
            ))}
            {' '}— may not render correctly.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tmpl-category">
            Category (optional)
          </label>
          <select
            id="tmpl-category"
            {...register('category_id')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Any —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tmpl-dept">
            Department (optional)
          </label>
          <select
            id="tmpl-dept"
            {...register('department_id')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Any —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('active')} className="rounded" />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </form>
  );
}
