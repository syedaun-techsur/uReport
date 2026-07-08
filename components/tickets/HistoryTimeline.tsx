'use client';
import {
  ArrowRightLeft,
  UserCheck,
  MessageSquare,
  Paperclip,
  Tag,
  Clock,
} from 'lucide-react';
import type { TicketHistoryEntry } from '@/types/domain';

// T-05-13: Notes are staff-entered text rendered in React JSX (not dangerouslySetInnerHTML)
// React escapes HTML entities automatically — no XSS path

function getActionIcon(action: string) {
  switch (action) {
    case 'STATUS_CHANGE':
      return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
    case 'ASSIGNMENT':
      return <UserCheck className="h-4 w-4 text-green-500" />;
    case 'RESPONSE':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'MEDIA_ADDED':
      return <Paperclip className="h-4 w-4 text-orange-500" />;
    case 'SUBSTATUS_CHANGE':
      return <Tag className="h-4 w-4 text-yellow-600" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function getActionDescription(entry: TicketHistoryEntry): string {
  switch (entry.action) {
    case 'STATUS_CHANGE':
      return `Changed status from ${entry.from_value ?? '—'} to ${entry.to_value ?? '—'}`;
    case 'ASSIGNMENT':
      return entry.to_value
        ? `Assigned to ${entry.to_value}`
        : 'Unassigned';
    case 'RESPONSE':
      return 'Posted a response';
    case 'MEDIA_ADDED':
      return `Uploaded ${entry.to_value ?? 'a file'}`;
    case 'SUBSTATUS_CHANGE':
      return `Updated substatus to ${entry.to_value ?? '—'}`;
    default:
      return entry.action.toLowerCase().replace(/_/g, ' ');
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface HistoryTimelineProps {
  entries: TicketHistoryEntry[];
}

export function HistoryTimeline({ entries }: HistoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <div data-testid="history-timeline" className="history-timeline text-sm text-gray-500 py-4">
        No history yet.
      </div>
    );
  }

  return (
    <ol data-testid="history-timeline" className="history-timeline relative border-l border-gray-200 ml-4">
      {entries.map((entry) => (
        <li key={entry.id} className="mb-6 ml-6">
          <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-gray-200">
            {getActionIcon(entry.action)}
          </span>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-900">
              {getActionDescription(entry)}
            </p>
            <p className="text-xs text-gray-500">
              {entry.actor_name ?? 'System'} · {formatTimestamp(entry.created_at)}
            </p>
            {entry.note && (
              <p className="mt-1 text-xs italic text-gray-500">{entry.note}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
