'use client';
// components/admin/DepartmentForm.tsx
// Create/edit department. Uses react-hook-form + Zod resolver.

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateDepartmentSchema, UpdateDepartmentSchema } from '@/schemas/admin';
import type { CreateDepartmentInput } from '@/schemas/admin';

interface StaffUser {
  id: string;
  username: string;
  email: string;
}

interface Department {
  id: string;
  name: string;
  active: boolean;
  default_assignee_id?: string | null;
  default_assignee?: { id: string; username: string; email: string } | null;
}

interface DepartmentFormProps {
  department?: Department | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DepartmentForm({ department, onSuccess, onCancel }: DepartmentFormProps) {
  const isEdit = Boolean(department);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const schema = isEdit ? UpdateDepartmentSchema : CreateDepartmentSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(schema),
    defaultValues: department
      ? {
          name: department.name,
          active: department.active,
          default_assignee_id: department.default_assignee_id ?? undefined,
        }
      : { active: true },
  });

  useEffect(() => {
    // Load staff users for default assignee dropdown
    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const res = await fetch('/api/staff/users?role=staff&active=true&page_size=100');
        if (res.ok) {
          const json = await res.json();
          setStaffUsers(Array.isArray(json.data) ? json.data : []);
        }
      } catch {
        // non-critical — dropdown just stays empty
      } finally {
        setLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  useEffect(() => {
    if (department) {
      reset({
        name: department.name,
        active: department.active,
        default_assignee_id: department.default_assignee_id ?? undefined,
      });
    }
  }, [department, reset]);

  async function onSubmit(values: CreateDepartmentInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/departments/${department!.id}` : '/api/admin/departments';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        setServerError(err?.error?.message ?? 'Failed to save department');
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
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="dept-name">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="dept-name"
          {...register('name')}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Department name"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="default_assignee_id">
          Default Assignee
        </label>
        <select
          id="default_assignee_id"
          {...register('default_assignee_id')}
          disabled={loadingUsers}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— None —</option>
          {staffUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username} ({u.email})
            </option>
          ))}
        </select>
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
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Department'}
        </button>
      </div>
    </form>
  );
}
