'use client';
// app/staff/tickets/page.tsx
// Staff ticket queue — primary daily workspace.
// FRD §F03 — STAFF-01, STAFF-02, STAFF-03
// Reads URL search params, fetches /api/staff/tickets, renders FilterPanel + TicketTable + pagination.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterPanel } from '@/components/tickets/FilterPanel';
import { TicketTable } from '@/components/tickets/TicketTable';
import { BookmarkBar } from '@/components/tickets/BookmarkBar';
import type { TicketSummary, PaginationMeta } from '@/types/domain';
import { Suspense } from 'react';

function StaffTicketsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, page_size: 25, total_pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const paramsString = searchParams.toString();

  useEffect(() => {
    let cancelled = false;

    async function fetchTickets() {
      setIsLoading(true);
      setError(null);

      try {
        const url = `/api/staff/tickets${paramsString ? `?${paramsString}` : ''}`;
        const res = await fetch(url);

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            // Session expired — redirect to login
            router.push('/login?callbackUrl=/staff/tickets');
            return;
          }
          throw new Error(`Failed to fetch tickets: ${res.status}`);
        }

        const json = await res.json() as { data: TicketSummary[]; meta: PaginationMeta };
        if (!cancelled) {
          setTickets(json.data);
          setMeta(json.meta);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tickets');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchTickets();
    return () => { cancelled = true; };
  }, [paramsString, router]);

  const currentPage = Number(searchParams.get('page') ?? '1');

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/staff/tickets?${params.toString()}`);
  }

  // Convert current search params to a plain object for BookmarkBar
  const currentParams = Object.fromEntries(searchParams.entries());

  // Called when a bookmark is loaded — replace all URL params with bookmark's filter_json
  function handleBookmarkLoad(filters: Record<string, string>) {
    router.push('/staff/tickets?' + new URLSearchParams(filters).toString());
  }

  return (
    <main className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ticket Queue</h1>
        {!isLoading && (
          <span className="text-sm text-muted-foreground">
            {meta.total} ticket{meta.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <BookmarkBar currentFilters={currentParams} onLoad={handleBookmarkLoad} />

      <FilterPanel />

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : (
        <TicketTable data={tickets} isLoading={isLoading} />
      )}

      {/* Pagination */}
      {!isLoading && meta.total_pages > 1 && (
        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.total_pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
              className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= meta.total_pages}
              aria-label="Next page"
              className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function StaffTicketsPage() {
  // useSearchParams() requires Suspense boundary
  return (
    <Suspense fallback={
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading…</p>
      </main>
    }>
      <StaffTicketsContent />
    </Suspense>
  );
}
