'use client';
// app/admin/response-templates/page.tsx
// Admin response templates management page.

import { useEffect, useState, useCallback } from 'react';
import { TemplateForm } from '@/components/admin/TemplateForm';

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
  category?: { id: string; name: string } | null;
  department_id?: string | null;
  department?: { id: string; name: string } | null;
}

interface ApiResponse {
  data: Template[];
  meta: { total: number };
}

export default function ResponseTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch('/api/admin/response-templates?active=all'),
        fetch('/api/admin/categories?active=all&page_size=100'),
      ]);
      if (!tRes.ok) throw new Error('Failed to load templates');
      const tJson: ApiResponse = await tRes.json();
      setTemplates(tJson.data);
      if (cRes.ok) {
        const cJson = await cRes.json();
        setCategories(cJson.data ?? []);
        setDepartments(cJson.departments ?? []);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleDeactivate(tmpl: Template) {
    setDeactivatingId(tmpl.id);
    try {
      const res = await fetch(`/api/admin/response-templates/${tmpl.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err?.error?.message ?? 'Failed to deactivate');
        return;
      }
      fetchAll();
    } finally {
      setDeactivatingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading templates…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p>Error: {error}</p>
        <button onClick={fetchAll} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Response Templates</h1>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setShowForm(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create Template
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editingTemplate ? `Edit: ${editingTemplate.name}` : 'New Response Template'}
          </h2>
          <TemplateForm
            template={editingTemplate}
            categories={categories}
            departments={departments}
            onSuccess={() => {
              setShowForm(false);
              setEditingTemplate(null);
              fetchAll();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingTemplate(null);
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Body Preview</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Department</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No templates yet. Click &ldquo;Create Template&rdquo; to add one.
                </td>
              </tr>
            ) : (
              templates.map((tmpl) => (
                <tr key={tmpl.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{tmpl.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    <span className="block truncate">
                      {tmpl.body.slice(0, 100)}{tmpl.body.length > 100 ? '…' : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tmpl.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{tmpl.department?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        tmpl.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {tmpl.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingTemplate(tmpl);
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    {tmpl.active && (
                      <button
                        onClick={() => handleDeactivate(tmpl)}
                        disabled={deactivatingId === tmpl.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                      >
                        {deactivatingId === tmpl.id ? '…' : 'Deactivate'}
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
