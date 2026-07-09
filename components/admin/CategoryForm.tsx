'use client';
// components/admin/CategoryForm.tsx
// Create/edit category in a sheet/dialog. Uses react-hook-form + Zod resolver.

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCategorySchema, UpdateCategorySchema } from '@/schemas/admin';
import type { CreateCategoryInput } from '@/schemas/admin';

interface CategoryGroup {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface Category {
  id: string;
  service_code: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  anon_allowed: boolean;
  active: boolean;
  group_id?: string | null;
  department_id?: string | null;
}

interface CategoryFormProps {
  category?: Category | null;
  groups: CategoryGroup[];
  departments: Department[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function CategoryForm({ category, groups, departments, onSuccess, onCancel }: CategoryFormProps) {
  const isEdit = Boolean(category);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = isEdit ? UpdateCategorySchema : CreateCategorySchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(schema),
    defaultValues: category
      ? {
          service_code: category.service_code,
          name: category.name,
          description: category.description ?? undefined,
          icon: category.icon ?? undefined,
          color: category.color ?? undefined,
          anon_allowed: category.anon_allowed,
          active: category.active,
          group_id: category.group_id ?? undefined,
          department_id: category.department_id ?? undefined,
        }
      : { anon_allowed: true, active: true },
  });

  useEffect(() => {
    if (category) {
      reset({
        service_code: category.service_code,
        name: category.name,
        description: category.description ?? undefined,
        icon: category.icon ?? undefined,
        color: category.color ?? undefined,
        anon_allowed: category.anon_allowed,
        active: category.active,
        group_id: category.group_id ?? undefined,
        department_id: category.department_id ?? undefined,
      });
    }
  }, [category, reset]);

  async function onSubmit(values: CreateCategoryInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/categories/${category!.id}` : '/api/admin/categories';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        setServerError(err?.error?.message ?? 'Failed to save category');
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
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="service_code">
          Service Code <span className="text-red-500">*</span>
        </label>
        <input
          id="service_code"
          {...register('service_code')}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. POTHOLE"
        />
        {errors.service_code && (
          <p className="mt-1 text-xs text-red-600">{errors.service_code.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="name">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          {...register('name')}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Category name"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="group_id">
            Group
          </label>
          <select
            id="group_id"
            {...register('group_id')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— None —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="department_id">
            Department
          </label>
          <select
            id="department_id"
            {...register('department_id')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— None —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="icon">
            Icon (lucide name)
          </label>
          <input
            id="icon"
            {...register('icon')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. trash-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="color">
            Color (#RRGGBB)
          </label>
          <input
            id="color"
            {...register('color')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="#3B82F6"
          />
          {errors.color && <p className="mt-1 text-xs text-red-600">{errors.color.message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register('anon_allowed')} className="rounded" />
          Anonymous submissions allowed
        </label>
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
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
        </button>
      </div>
    </form>
  );
}
