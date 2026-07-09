'use client';
// components/crm/PersonSearchPanel.tsx
// Full-text search panel for CRM people list — CRM-01
// Debounced search (300ms), paginated results, anonymized person support

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, UserPlus, Users } from 'lucide-react';

interface PersonResult {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  anonymized_at: string | null;
  ticket_count: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function PersonSearchPanel() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<PersonResult[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce query by 300ms
  useEffect(() => {
    if (query.length === 0) {
      setDebouncedQuery('');
      setResults([]);
      setMeta(null);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchResults = useCallback(async (q: string, pageNum: number) => {
    if (q.length < 2) {
      setResults([]);
      setMeta(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q, page: String(pageNum), page_size: '20' });
      const res = await fetch(`/api/staff/people?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }
      const json = (await res.json()) as { data: PersonResult[]; meta: PaginationMeta };
      setResults(json.data);
      setMeta(json.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchResults(debouncedQuery, page);
  }, [debouncedQuery, page, fetchResults]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={16}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or phone (min 2 characters)…"
            aria-label="Search people"
            data-testid="person-search-input"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Link
          href="/staff/people/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          data-testid="create-person-btn"
        >
          <UserPlus size={16} aria-hidden="true" />
          Create New Person
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Empty / prompt states */}
      {!isLoading && !error && query.length < 2 && (
        <div
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center text-muted-foreground"
          data-testid="search-prompt"
        >
          <Users size={32} aria-hidden="true" />
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      )}

      {/* No results */}
      {!isLoading && !error && debouncedQuery.length >= 2 && results.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center text-muted-foreground"
          data-testid="no-results"
        >
          <Users size={32} aria-hidden="true" />
          <p className="text-sm">No matching people found</p>
          <Link
            href="/staff/people/new"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Create a new person record
          </Link>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading results">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {/* Results table */}
      {!isLoading && results.length > 0 && (
        <>
          <div className="text-xs text-muted-foreground">
            {meta ? `${meta.total} result${meta.total !== 1 ? 's' : ''}` : ''}
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Phone</th>
                  <th className="px-4 py-3 text-right font-medium">Tickets</th>
                </tr>
              </thead>
              <tbody>
                {results.map((person) => (
                  <tr
                    key={person.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    data-testid="person-row"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/staff/people/${person.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {person.anonymized_at
                          ? 'Anonymous Constituent'
                          : (person.name ?? '—')}
                      </Link>
                      {person.anonymized_at && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          Anonymized
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {person.anonymized_at ? '—' : (person.email ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {person.anonymized_at ? '—' : (person.phone ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {person.ticket_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between py-1">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.total_pages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= meta.total_pages}
                  aria-label="Next page"
                  className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
