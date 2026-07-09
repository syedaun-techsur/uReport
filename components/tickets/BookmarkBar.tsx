'use client';
// components/tickets/BookmarkBar.tsx
// Bookmark dropdown + Save View button for the staff ticket queue.
// FRD §F03 — STAFF-04, STAFF-05
// Lets staff save their current filter state as a named bookmark and load/delete saved views.

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';

interface BookmarkRecord {
  id: string;
  name: string;
  filter_json: Record<string, string>;
  created_at: string;
}

export interface BookmarkBarProps {
  currentFilters: Record<string, string>; // current URL search params as plain object
  onLoad: (filters: Record<string, string>) => void; // called with bookmark's filter_json
}

export function BookmarkBar({ currentFilters, onLoad }: BookmarkBarProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');

  // Fetch bookmark list on mount
  async function fetchBookmarks() {
    try {
      const res = await fetch('/api/staff/bookmarks');
      if (res.ok) {
        const json = await res.json() as { data: BookmarkRecord[] };
        setBookmarks(json.data ?? []);
      }
    } catch {
      // Silently ignore — bookmark list is a non-critical enhancement
    }
  }

  useEffect(() => {
    void fetchBookmarks();
  }, []);

  // Load a bookmark: fetch the single record and call onLoad
  async function handleSelectBookmark(id: string) {
    setSelectedId(id);
    if (!id) return;

    try {
      const res = await fetch(`/api/staff/bookmarks/${id}`);
      if (res.ok) {
        const json = await res.json() as { id: string; name: string; filter_json: Record<string, string>; created_at: string };
        onLoad(json.filter_json);
      }
    } catch {
      // Silently ignore
    }
  }

  // Open the save dialog
  function handleOpenSaveDialog() {
    setBookmarkName('');
    setNameError(null);
    setIsDialogOpen(true);
  }

  // Confirm save
  async function handleConfirmSave() {
    const name = bookmarkName.trim();
    if (!name) {
      setNameError('Name is required');
      return;
    }

    setIsSaving(true);
    setNameError(null);

    try {
      const res = await fetch('/api/staff/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, filter_json: currentFilters }),
      });

      if (res.status === 409) {
        setNameError('Name already taken');
        setIsSaving(false);
        return;
      }

      if (!res.ok) {
        setNameError('Failed to save. Please try again.');
        setIsSaving(false);
        return;
      }

      // Refresh bookmark list and close dialog
      await fetchBookmarks();
      setIsDialogOpen(false);
      setBookmarkName('');
      setSelectedId('');
    } catch {
      setNameError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // Delete a bookmark
  async function handleDeleteBookmark(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setIsDeleting(id);

    try {
      const res = await fetch(`/api/staff/bookmarks/${id}`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        await fetchBookmarks();
        if (selectedId === id) setSelectedId('');
      }
    } catch {
      // Silently ignore
    } finally {
      setIsDeleting(null);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Bookmark dropdown */}
        <div className="flex flex-col gap-1">
          <label htmlFor="bookmark-select" className="text-xs font-medium text-muted-foreground">
            Saved views
          </label>
          <div className="relative flex items-center">
            <select
              id="bookmark-select"
              name="bookmark"
              value={selectedId}
              onChange={(e) => { void handleSelectBookmark(e.target.value); }}
              data-testid="bookmark-select"
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring pr-8 min-w-[180px]"
            >
              <option value="">Load saved view…</option>
              {bookmarks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Per-bookmark delete buttons — listed beside the select */}
        {bookmarks.length > 0 && selectedId && (
          <button
            type="button"
            onClick={(e) => { void handleDeleteBookmark(selectedId, e); }}
            disabled={isDeleting === selectedId}
            aria-label="Delete selected saved view"
            data-testid="delete-bookmark-btn"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isDeleting === selectedId ? '…' : 'Delete view'}
          </button>
        )}

        {/* Save current view button */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">&nbsp;</span>
          <button
            type="button"
            onClick={handleOpenSaveDialog}
            data-testid="save-bookmark-btn"
            aria-label="Save current view as bookmark"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Bookmark className="h-4 w-4" />
            Save view
          </button>
        </div>
      </div>

      {/* Save dialog — inline modal */}
      {isDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-bookmark-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setIsDialogOpen(false); }}
        >
          <div className="relative w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
            <h2 id="save-bookmark-title" className="text-lg font-semibold mb-4">
              Save current view
            </h2>

            <div className="flex flex-col gap-2">
              <label htmlFor="bookmark-name-input" className="text-sm font-medium">
                View name
              </label>
              <input
                id="bookmark-name-input"
                data-testid="bookmark-name-input"
                type="text"
                placeholder="e.g. Open water issues"
                value={bookmarkName}
                onChange={(e) => { setBookmarkName(e.target.value); setNameError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleConfirmSave(); }}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              {nameError && (
                <p className="text-xs text-destructive" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="h-9 rounded-md border border-input bg-background px-4 text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmSave(); }}
                data-testid="confirm-save-btn"
                disabled={isSaving}
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
