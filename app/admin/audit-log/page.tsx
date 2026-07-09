'use client';
// app/admin/audit-log/page.tsx
// Admin audit log viewer — read-only, filterable, paginated
// ADMIN-07: AdminAuditLog viewer

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuditEntry {
  id: string;
  actor_id: string;
  actor: { username: string } | null;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface UserOption {
  id: string;
  username: string;
}

const RESOURCE_TYPES = [
  'Category',
  'Department',
  'Substatus',
  'ResponseTemplate',
  'User',
  'ApiKey',
] as const;

export default function AdminAuditLogPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, page_size: 25, total_pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [actorId, setActorId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Users list for actor filter dropdown
  const [users, setUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    fetch('/api/admin/users?page_size=100')
      .then((r) => r.json())
      .then((data: { data: UserOption[] }) => setUsers(data.data ?? []))
      .catch(() => setUsers([]));
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (actorId) params.set('actor_id', actorId);
      if (resourceType) params.set('resource_type', resourceType);
      if (action) params.set('action', action);
      if (startDate) params.set('start_date', new Date(startDate).toISOString());
      if (endDate) params.set('end_date', new Date(endDate).toISOString());
      params.set('page', String(page));
      params.set('page_size', '25');

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load audit log');
      }
      const json = (await res.json()) as { data: AuditEntry[]; meta: PaginationMeta };
      setEntries(json.data);
      setMeta(json.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setIsLoading(false);
    }
  }, [actorId, resourceType, action, startDate, endDate, page, router]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void fetchLogs();
  }

  function truncateMetadata(meta: Record<string, unknown> | null): string {
    if (!meta) return '—';
    const json = JSON.stringify(meta);
    return json.length > 120 ? json.slice(0, 117) + '…' : json;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Read-only record of all admin actions</p>
      </div>

      {/* Filter panel */}
      <form
        onSubmit={handleFilter}
        className="mb-6 p-4 border rounded-lg bg-card shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="actor-filter" className="text-xs font-medium text-muted-foreground uppercase">
            Actor
          </label>
          <select
            id="actor-filter"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className="px-3 py-2 border rounded text-sm bg-background"
          >
            <option value="">All actors</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="resource-type-filter" className="text-xs font-medium text-muted-foreground uppercase">
            Resource Type
          </label>
          <select
            id="resource-type-filter"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="px-3 py-2 border rounded text-sm bg-background"
          >
            <option value="">All types</option>
            {RESOURCE_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="action-filter" className="text-xs font-medium text-muted-foreground uppercase">
            Action
          </label>
          <input
            id="action-filter"
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. USER_CREATED"
            className="px-3 py-2 border rounded text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="start-date" className="text-xs font-medium text-muted-foreground uppercase">
            From Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="end-date" className="text-xs font-medium text-muted-foreground uppercase">
            To Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={() => {
              setActorId('');
              setResourceType('');
              setAction('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
            className="px-4 py-2 text-sm border rounded hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </form>

      {isLoading && <p className="text-muted-foreground text-sm">Loading audit log…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm" data-testid="audit-log-table">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium">Actor</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Resource</th>
                  <th className="px-4 py-3 text-left font-medium">Resource ID</th>
                  <th className="px-4 py-3 text-left font-medium">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {entry.actor?.username ?? entry.actor_id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{entry.resource_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {entry.resource_id.slice(0, 12)}…
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-xs truncate">
                      {truncateMetadata(entry.metadata)}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No audit log entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-muted-foreground">
              {meta.total} total entries — page {meta.page} of {meta.total_pages || 1}
            </span>
            {meta.total_pages > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border rounded hover:bg-muted disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
                  disabled={page === meta.total_pages}
                  className="px-3 py-1.5 border rounded hover:bg-muted disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
