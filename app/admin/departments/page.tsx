'use client';
// app/admin/departments/page.tsx
// Admin departments management page.

import { useEffect, useState, useCallback } from 'react';
import { DepartmentForm } from '@/components/admin/DepartmentForm';

interface Department {
  id: string;
  name: string;
  active: boolean;
  default_assignee_id?: string | null;
  default_assignee?: { id: string; username: string; email: string } | null;
  user_count?: number;
}

interface ApiResponse {
  data: Department[];
  meta: { total: number };
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deactivateWarning, setDeactivateWarning] = useState<{
    name: string;
    count: number;
  } | null>(null);

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/departments');
      if (!res.ok) throw new Error('Failed to load departments');
      const json: ApiResponse = await res.json();
      setDepartments(json.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  async function handleDeactivate(dept: Department) {
    setDeactivatingId(dept.id);
    try {
      const res = await fetch(`/api/admin/departments/${dept.id}`, {
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
      if (data.active_category_count && data.active_category_count > 0) {
        setDeactivateWarning({ name: dept.name, count: data.active_category_count });
      }
      fetchDepartments();
    } finally {
      setDeactivatingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading departments…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p>Error: {error}</p>
        <button onClick={fetchDepartments} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <button
          onClick={() => {
            setEditingDept(null);
            setShowForm(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create Department
        </button>
      </div>

      {deactivateWarning && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <p className="text-sm text-yellow-800">
            <strong>{deactivateWarning.name}</strong> was deactivated, but{' '}
            <strong>{deactivateWarning.count}</strong> active categor
            {deactivateWarning.count !== 1 ? 'ies are' : 'y is'} still linked to it.
          </p>
          <button
            onClick={() => setDeactivateWarning(null)}
            className="mt-1 text-xs text-yellow-600 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editingDept ? `Edit: ${editingDept.name}` : 'New Department'}
          </h2>
          <DepartmentForm
            department={editingDept}
            onSuccess={() => {
              setShowForm(false);
              setEditingDept(null);
              fetchDepartments();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingDept(null);
            }}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Default Assignee</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Staff Count</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No departments yet.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{dept.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {dept.default_assignee?.username ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{dept.user_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        dept.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {dept.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingDept(dept);
                        setShowForm(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    {dept.active && (
                      <button
                        onClick={() => handleDeactivate(dept)}
                        disabled={deactivatingId === dept.id}
                        className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50"
                      >
                        {deactivatingId === dept.id ? '…' : 'Deactivate'}
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
