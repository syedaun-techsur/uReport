'use client';
// components/tickets/TicketTable.tsx
// TanStack Table data table for the staff ticket queue.
// FRD §F03 — STAFF-01
// Columns: Reference ID (link), Category, Department, Status, Assignee, Address, Created, Updated

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import type { TicketSummary } from '@/types/domain';

const columnHelper = createColumnHelper<TicketSummary>();

const columns = [
  columnHelper.accessor('reference_id', {
    header: 'Reference',
    cell: (info) => (
      <Link
        // Link by primary id (ticket_id); the detail page + all /api/staff/tickets/[id]
        // routes look up by id, not reference_id. The reference_id stays as the label.
        href={`/staff/tickets/${info.row.original.ticket_id}`}
        className="font-mono text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('category_name', {
    header: 'Category',
    cell: (info) => <span className="text-sm">{info.getValue()}</span>,
  }),
  columnHelper.accessor('department_name', {
    header: 'Department',
    cell: (info) => (
      <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <StatusBadge
        status={info.getValue()}
        substatusLabel={info.row.original.substatus_label}
      />
    ),
  }),
  columnHelper.accessor('assignee_name', {
    header: 'Assignee',
    cell: (info) => (
      <span className="text-sm text-muted-foreground">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('address', {
    header: 'Address',
    cell: (info) => (
      <span className="text-sm max-w-[200px] truncate block">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('created_at', {
    header: 'Created',
    cell: (info) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
  columnHelper.accessor('updated_at', {
    header: 'Updated',
    cell: (info) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
];

interface TicketTableProps {
  data: TicketSummary[];
  isLoading: boolean;
}

export function TicketTable({ data, isLoading }: TicketTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground" aria-live="polite">
        Loading tickets…
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-10 px-4 text-left align-middle font-medium text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-10 text-center text-muted-foreground"
              >
                No tickets found
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
