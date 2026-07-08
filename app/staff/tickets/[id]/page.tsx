'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MiniMap } from '@/components/maps/MiniMap';
import { HistoryTimeline } from '@/components/tickets/HistoryTimeline';
import { MediaGallery } from '@/components/tickets/MediaGallery';
import { StatusBadge } from '@/components/tickets/StatusBadge';
import type { TicketDetail } from '@/types/domain';

export default function StaffTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/staff/tickets/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
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
        <MediaGallery media={ticket.media} ticketId={ticket.ticket_id} />
      </section>

      {/* Action Panel placeholder — populated by plan 05-04 */}
      <section>
        <div data-testid="action-panel" className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
          Actions panel coming in v1.1
        </div>
      </section>
    </div>
  );
}
