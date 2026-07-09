'use client';
// components/admin/SubstatusForm.tsx
// Create/edit substatus. Uses react-hook-form + Zod resolver.

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateSubstatusSchema, UpdateSubstatusSchema } from '@/schemas/admin';
import type { CreateSubstatusInput } from '@/schemas/admin';

interface Substatus {
  id: string;
  label: string;
  internal_label?: string | null;
  status: 'open' | 'in_progress' | 'closed' | 'archived';
  sort_order: number;
  active: boolean;
}

interface SubstatusFormProps {
  substatus?: Substatus | null;
  defaultStatus?: 'open' | 'in_progress' | 'closed' | 'archived';
  onSuccess: () => void;
  onCancel: () => void;
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
] as const;

export function SubstatusForm({ substatus, defaultStatus = 'open', onSuccess, onCancel }: SubstatusFormProps) {
  const isEdit = Boolean(substatus);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = isEdit ? UpdateSubstatusSchema : CreateSubstatusSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSubstatusInput>({
    resolver: zodResolver(schema),
    defaultValues: substatus
      ? {
          label: substatus.label,
          internal_label: substatus.internal_label ?? undefined,
          status: substatus.status,
          sort_order: substatus.sort_order,
          active: substatus.active,
        }
      : { status: defaultStatus, sort_order: 0, active: true },
  });

  useEffect(() => {
    if (substatus) {
      reset({
        label: substatus.label,
        internal_label: substatus.internal_label ?? undefined,
        status: substatus.status,
        sort_order: substatus.sort_order,
        active: substatus.active,
      });
    }
  }, [substatus, reset]);

  async function onSubmit(values: CreateSubstatusInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/substatuses/${substatus!.id}` : '/api/admin/substatuses';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        setServerError(err?.error?.message ?? 'Failed to save substatus');
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
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sub-label">
          Label <span className="text-red-500">*</span>
        </label>
        <input
          id="sub-label"
          {...register('label')}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. Awaiting Crew"
        />
        {errors.label && <p className="mt-1 text-xs text-red-600">{errors.label.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="internal_label">
          Internal Label (staff-only)
        </label>
        <input
          id="internal_label"
          {...register('internal_label')}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional internal description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sub-status">
            Status Bucket <span className="text-red-500">*</span>
          </label>
          <select
            id="sub-status"
            {...register('status')}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="sort_order">
            Sort Order
          </label>
          <input
            id="sort_order"
            type="number"
            min={0}
            {...register('sort_order', { valueAsNumber: true })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Substatus'}
        </button>
      </div>
    </form>
  );
}
