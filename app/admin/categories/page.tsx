'use client';
// app/admin/categories/page.tsx
// Admin categories management page.
// Fetches categories list and embeds CategoryForm for create/edit.

import { useEffect, useState, useCallback } from 'react';
import { CategoryForm } from '@/components/admin/CategoryForm';

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
  group?: { id: string; name: string } | null;
  department_id?: string | null;
  department?: { id: string; name: string } | null;
}

interface ApiResponse {
  data: Category[];
  groups: CategoryGroup[];
  departments: Department[];
  meta: { total: number; page: number; page_size: number; total_pages: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivateWarning, setDeactivateWarning] = useState<{ id: string; name: string; count: number } | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/categories?active=all&page_size=100');
      if (!res.ok) throw new Error('Failed to load categories');
      const json: ApiResponse = await res.json();
      setCategories(json.data);
      setGroups(json.groups ?? []);
      setDepartments(json.departments ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setEditingCategory(null);
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditingCategory(cat);
    setShowForm(true);
  }

  async function handleDeactivate(cat: Category) {
    setDeactivatingId(cat.id);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err?.error?.message ?? 'Failed to deactivate');
        return;
      }
      const data = await res.json();
      // Show warning if open tickets exist, but proceed
      if (data.open_ticket_count && data.open_ticket_count > 0) {
        setDeactivateWarning({ id: cat.id, name: cat.name, count: data.open_ticket_count });
      }
      fetchCategories();
    } finally {
      setDeactivatingId(null);
    }
  }

  function handleFormSuccess() {
    setShowForm(false);
    setEditingCategory(null);
    fetchCategories();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading categories…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p>Error: {error}</p>
        <button onClick={fetchCategories} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create Category
        </button>
      </div>

      {/* Deactivation warning banner */}
      {deactivateWarning && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">
            <strong>{deactivateWarning.name}</strong> was deactivated, but{' '}
            <strong>{deactivateWarning.count}</strong> open ticket
            {deactivateWarning.count !== 1 ? 's' : ''} still reference this category.
          </p>
          <button
            onClick={() => setDeactivateWarning(null)}
            className="mt-1 text-xs text-yellow-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form panel */}
      {showForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editingCategory ? `Edit: ${editingCategory.name}` : 'New Category'}
          </h2>
          <CategoryForm
            category={editingCategory}
            groups={groups}
            departments={departments}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingCategory(null);
            }}
          />
        </div>
      )}

      {/* Categories table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Service Code</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Group</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Department</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Anon</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No categories yet. Click &ldquo;Create Category&rdquo; to add one.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{cat.service_code}</td>
                  <td className="px-4 py-3 text-gray-600">{cat.group?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{cat.department?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        cat.anon_allowed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat.anon_allowed ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        cat.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {cat.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openEdit(cat)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    {cat.active && (
                      <button
                        onClick={() => handleDeactivate(cat)}
                        disabled={deactivatingId === cat.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                        data-testid={`deactivate-${cat.id}`}
                      >
                        {deactivatingId === cat.id ? '…' : 'Deactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
