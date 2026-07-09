'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MiniMap } from '@/components/maps/MiniMap';
import { HistoryTimeline } from '@/components/tickets/HistoryTimeline';
import { MediaGallery } from '@/components/tickets/MediaGallery';
import { ResponseComposer } from '@/components/tickets/ResponseComposer';
import { StatusBadge } from '@/components/tickets/StatusBadge';
import type { TicketDetail } from '@/types/domain';

type TicketStatus = 'open' | 'in_progress' | 'closed' | 'archived';

// ─── Staff User type for assignee search ──────────────────────────────────

interface StaffUser {
  id: string;
  username: string;
  department_id: string | null;
  role: string;
}

// ─── StatusControl ─────────────────────────────────────────────────────────

function StatusControl({
  ticketId,
  currentStatus,
  onSuccess,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
  onSuccess: () => void;
}) {
  const [pending, setPending] = useState<TicketStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'closed', label: 'Closed' },
    { value: 'archived', label: 'Archived' },
  ];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as TicketStatus;
    if (newStatus === currentStatus) return;
    setPending(newStatus);
    setConfirming(true);
    setError(null);
  }

  async function confirmChange() {
    if (!pending) return;
    setConfirming(false);

    const res = await fetch(`/api/staff/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: pending }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        (data as { error?: { message?: string } })?.error?.message ?? 'Failed to update status.',
      );
    } else {
      onSuccess();
    }
    setPending(null);
  }

  function cancelChange() {
    setPending(null);
    setConfirming(false);
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
        Status
      </label>
      <select
        data-testid="status-select"
        value={currentStatus}
        onChange={handleChange}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Inline confirmation dialog */}
      {confirming && pending && (
        <div
          role="dialog"
          aria-modal="true"
          className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm"
        >
          <p className="text-yellow-800">
            Change status from <strong>{currentStatus}</strong> to{' '}
            <strong>{pending}</strong>?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={confirmChange}
              className="rounded bg-yellow-600 px-3 py-1 text-xs text-white hover:bg-yellow-700"
            >
              Confirm
            </button>
            <button
              onClick={cancelChange}
              className="rounded bg-white px-3 py-1 text-xs text-gray-600 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── AssigneeControl ───────────────────────────────────────────────────────

function AssigneeControl({
  ticketId,
  currentAssigneeName,
  currentAssigneeId,
  onSuccess,
}: {
  ticketId: string;
  currentAssigneeName: string | null;
  currentAssigneeId: string | null;
  onSuccess: () => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StaffUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/staff/users?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions((data as { data: StaffUser[] }).data ?? []);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function assignUser(user: StaffUser) {
    setShowDropdown(false);
    setQuery('');
    setError(null);

    const res = await fetch(`/api/staff/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee_id: user.id }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        (data as { error?: { message?: string } })?.error?.message ?? 'Failed to assign user.',
      );
    } else {
      onSuccess();
    }
  }

  async function unassign() {
    setError(null);
    const res = await fetch(`/api/staff/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee_id: null }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        (data as { error?: { message?: string } })?.error?.message ?? 'Failed to unassign.',
      );
    } else {
      onSuccess();
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
        Assignee
      </label>

      {currentAssigneeId && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            {currentAssigneeName}
          </span>
          <button
            type="button"
            onClick={unassign}
            className="text-xs text-gray-400 hover:text-red-500"
            aria-label="Unassign"
          >
            ×
          </button>
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Search staff to assign…"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            {suggestions.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onMouseDown={() => assignUser(u)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                >
                  {u.username}
                  {u.role === 'admin' && (
                    <span className="ml-1 text-xs text-gray-400">(admin)</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────

export default function StaffTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/staff/tickets/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // API returns flat fields (not nested under 'ticket' key)
        setTicket(data as TicketDetail);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load ticket');
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Loading ticket…</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-600">{error ?? 'Ticket not found.'}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to queue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Ticket Header */}
      <section data-testid="ticket-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              #{ticket.reference_id}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{ticket.address}</p>
          </div>
          <StatusBadge status={ticket.status} substatusLabel={ticket.substatus_label} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {ticket.category_name}
          </span>
          {ticket.department_name && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {ticket.department_name}
            </span>
          )}
          {ticket.assignee_name && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Assigned: {ticket.assignee_name}
            </span>
          )}
        </div>

        <p className="mt-4 text-sm text-gray-700">{ticket.description}</p>

        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
          <span>Updated: {new Date(ticket.updated_at).toLocaleString()}</span>
        </div>
      </section>

      {/* Mini Map */}
      {ticket.lat != null && ticket.lng != null && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Location
          </h2>
          <MiniMap lat={ticket.lat} lng={ticket.lng} />
        </section>
      )}

      {/* Action Panel */}
      <section>
        <div data-testid="action-panel" className="rounded-lg border border-gray-200 p-6 space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Actions
          </h2>

          {/* Status + Assignee controls */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <StatusControl
              ticketId={ticket.ticket_id}
              currentStatus={ticket.status as TicketStatus}
              onSuccess={fetchTicket}
            />
            <AssigneeControl
              ticketId={ticket.ticket_id}
              currentAssigneeName={ticket.assignee_name}
              currentAssigneeId={ticket.assignee_id}
              onSuccess={fetchTicket}
            />
          </div>

          {/* Response Composer */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-gray-700">Post a Note or Response</h3>
            <ResponseComposer
              ticketId={ticket.ticket_id}
              categoryId={ticket.category_id}
              departmentId={ticket.department_id}
              referenceId={ticket.reference_id}
              address={ticket.address}
              categoryName={ticket.category_name}
              onSuccess={fetchTicket}
            />
          </div>
        </div>
      </section>

      {/* History Timeline */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          History
        </h2>
        <HistoryTimeline entries={ticket.history} />
      </section>

      {/* Media Gallery */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Attachments
        </h2>
        <MediaGallery
          media={ticket.media}
          ticketId={ticket.ticket_id}
          onUploadSuccess={fetchTicket}
        />
      </section>
    </div>
  );
}
