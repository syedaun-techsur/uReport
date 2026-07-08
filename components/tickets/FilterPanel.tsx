'use client';
// components/tickets/FilterPanel.tsx
// Filter panel for the staff ticket queue.
// Syncs filter state to URL query params so the page is bookmarkable/shareable.
// FRD §F03 — STAFF-01, STAFF-02, STAFF-03

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface CategoryOption {
  id: string;
  name: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];

export function FilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state mirrors URL params — initialized from URL on mount
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') ?? '');
  const [departmentId, setDepartmentId] = useState(searchParams.get('department_id') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'created_at');
  const [order, setOrder] = useState(searchParams.get('order') ?? 'desc');

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Fetch reference data on mount
  useEffect(() => {
    async function fetchReferenceData() {
      try {
        const [catRes, deptRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/staff/departments'),
        ]);
        if (catRes.ok) {
          // /api/categories returns a bare array (public endpoint)
          const catData = await catRes.json() as CategoryOption[] | { data: CategoryOption[] };
          const cats = Array.isArray(catData) ? catData : (catData as { data: CategoryOption[] }).data ?? [];
          setCategories(cats);
        }
        if (deptRes.ok) {
          const deptData = await deptRes.json() as { data: DepartmentOption[] };
          setDepartments(deptData.data ?? []);
        }
      } catch {
        // Reference data unavailable — filters still work without dropdown options
      }
    }
    void fetchReferenceData();
  }, []);

  // FTS debounce — 300ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    // Reset to page 1 on any filter change
    params.delete('page');
    router.push(`/staff/tickets?${params.toString()}`);
  }

  function handleSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ q: value });
    }, 300);
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value);
    pushParams({ category_id: value });
  }

  function handleDepartmentChange(value: string) {
    setDepartmentId(value);
    pushParams({ department_id: value });
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    pushParams({ status: value });
  }

  function handleDateFromChange(value: string) {
    setDateFrom(value);
    pushParams({ date_from: value ? new Date(value).toISOString() : '' });
  }

  function handleDateToChange(value: string) {
    setDateTo(value);
    pushParams({ date_to: value ? new Date(value).toISOString() : '' });
  }

  function handleSortChange(value: string) {
    setSort(value);
    pushParams({ sort: value });
  }

  function handleOrderChange(value: string) {
    setOrder(value);
    pushParams({ order: value });
  }

  function handleClearFilters() {
    setQ('');
    setCategoryId('');
    setDepartmentId('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setSort('created_at');
    setOrder('desc');
    router.push('/staff/tickets');
  }

  return (
    <div className="flex flex-wrap gap-3 items-end rounded-lg border bg-card p-4 mb-4">
      {/* FTS search */}
      <div className="flex flex-col gap-1 min-w-[200px]">
        <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
          Search
        </label>
        <input
          id="q"
          name="q"
          type="text"
          placeholder="Search tickets…"
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          data-testid="search-input"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-1">
        <label htmlFor="category_id" className="text-xs font-medium text-muted-foreground">
          Category
        </label>
        <select
          id="category_id"
          name="category_id"
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          data-testid="category-filter"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Department */}
      <div className="flex flex-col gap-1">
        <label htmlFor="department_id" className="text-xs font-medium text-muted-foreground">
          Department
        </label>
        <select
          id="department_id"
          name="department_id"
          value={departmentId}
          onChange={(e) => handleDepartmentChange(e.target.value)}
          data-testid="department-filter"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1">
        <label htmlFor="status" className="text-xs font-medium text-muted-foreground">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          data-testid="status-filter"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date from */}
      <div className="flex flex-col gap-1">
        <label htmlFor="date_from" className="text-xs font-medium text-muted-foreground">
          Date from
        </label>
        <input
          id="date_from"
          name="date_from"
          type="date"
          value={dateFrom}
          onChange={(e) => handleDateFromChange(e.target.value)}
          data-testid="date-from"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Date to */}
      <div className="flex flex-col gap-1">
        <label htmlFor="date_to" className="text-xs font-medium text-muted-foreground">
          Date to
        </label>
        <input
          id="date_to"
          name="date_to"
          type="date"
          value={dateTo}
          onChange={(e) => handleDateToChange(e.target.value)}
          data-testid="date-to"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Sort field */}
      <div className="flex flex-col gap-1">
        <label htmlFor="sort" className="text-xs font-medium text-muted-foreground">
          Sort by
        </label>
        <select
          id="sort"
          name="sort"
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          data-testid="sort-field"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="created_at">Created at</option>
          <option value="updated_at">Updated at</option>
        </select>
      </div>

      {/* Sort order */}
      <div className="flex flex-col gap-1">
        <label htmlFor="order" className="text-xs font-medium text-muted-foreground">
          Order
        </label>
        <select
          id="order"
          name="order"
          value={order}
          onChange={(e) => handleOrderChange(e.target.value)}
          data-testid="sort-order"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {/* Clear filters */}
      <button
        type="button"
        onClick={handleClearFilters}
        data-testid="clear-filters"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}
