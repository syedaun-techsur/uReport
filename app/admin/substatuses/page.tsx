'use client';
// app/admin/substatuses/page.tsx
// Admin substatuses management page with drag-to-reorder.

import { useEffect, useState, useCallback } from 'react';
import { SubstatusForm } from '@/components/admin/SubstatusForm';

type StatusBucket = 'open' | 'in_progress' | 'closed' | 'archived';

interface Substatus {
  id: string;
  label: string;
  internal_label?: string | null;
  status: StatusBucket;
  sort_order: number;
  active: boolean;
}

interface ApiResponse {
  data: Substatus[];
  meta: { total: number };
}

const STATUS_BUCKETS: { key: StatusBucket; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'closed', label: 'Closed' },
  { key: 'archived', label: 'Archived' },
];

export default function SubstatusesPage() {
  const [substatuses, setSubstatuses] = useState<Substatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSub, setEditingSub] = useState<Substatus | null>(null);
  const [defaultBucket, setDefaultBucket] = useState<StatusBucket>('open');
  const [dragId, setDragId] = useState<string | null>(null);

  const fetchSubstatuses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/substatuses');
      if (!res.ok) throw new Error('Failed to load substatuses');
      const json: ApiResponse = await res.json();
      setSubstatuses(json.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubstatuses();
  }, [fetchSubstatuses]);

  async function handleReorder(bucket: StatusBucket, newOrder: Substatus[]) {
    const items = newOrder.map((s, i) => ({ id: s.id, sort_order: i }));
    setSubstatuses((prev) => {
      const others = prev.filter((s) => s.status !== bucket);
      const updated = newOrder.map((s, i) => ({ ...s, sort_order: i }));
      return [...others, ...updated].sort((a, b) => {
        if (a.status !== b.status) return a.status.localeCompare(b.status);
        return a.sort_order - b.sort_order;
      });
    });
    try {
      await fetch('/api/admin/substatuses/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
    } catch {
      // revert on failure
      fetchSubstatuses();
    }
  }

  function getByBucket(bucket: StatusBucket) {
    return substatuses
      .filter((s) => s.status === bucket)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading substatuses…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p>Error: {error}</p>
        <button onClick={fetchSubstatuses} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Substatuses</h1>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            {editingSub ? `Edit: ${editingSub.label}` : 'New Substatus'}
          </h2>
          <SubstatusForm
            substatus={editingSub}
            defaultStatus={defaultBucket}
            onSuccess={() => {
              setShowForm(false);
              setEditingSub(null);
              fetchSubstatuses();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingSub(null);
            }}
          />
        </div>
      )}

      <div className="space-y-6">
        {STATUS_BUCKETS.map(({ key, label }) => {
          const items = getByBucket(key);
          return (
            <div key={key} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                  {label}
                </h2>
                <button
                  onClick={() => {
                    setEditingSub(null);
                    setDefaultBucket(key);
                    setShowForm(true);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add
                </button>
              </div>
              {items.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400">No substatuses for {label}.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {items.map((sub, idx) => (
                    <li
                      key={sub.id}
                      draggable
                      onDragStart={() => setDragId(sub.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!dragId || dragId === sub.id) return;
                        const currentItems = getByBucket(key);
                        const fromIdx = currentItems.findIndex((s) => s.id === dragId);
                        const toIdx = idx;
                        if (fromIdx === -1) return;
                        const newOrder = [...currentItems];
                        const [moved] = newOrder.splice(fromIdx, 1);
                        newOrder.splice(toIdx, 0, moved);
                        handleReorder(key, newOrder);
                        setDragId(null);
                      }}
                      className={`flex items-center justify-between px-4 py-3 cursor-grab hover:bg-gray-50 ${
                        dragId === sub.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-gray-300 select-none">⠿</span>
                        <div>
                          <span className="text-sm text-gray-900">{sub.label}</span>
                          {sub.internal_label && (
                            <span className="ml-2 text-xs text-gray-400">
                              ({sub.internal_label})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            sub.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {sub.active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => {
                            setEditingSub(sub);
                            setShowForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Edit
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
