'use client';
// components/tickets/StatusBadge.tsx
// Color-coded status + optional substatus label badge.
// FRD §F03 — used in TicketTable column renderer.

export function StatusBadge({
  status,
  substatusLabel,
}: {
  status: string;
  substatusLabel?: string | null;
}) {
  const colors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status.replace('_', ' ')}
      {substatusLabel && (
        <span className="opacity-70">· {substatusLabel}</span>
      )}
    </span>
  );
}
