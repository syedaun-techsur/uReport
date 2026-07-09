'use client';
// components/crm/PersonDetail.tsx
// Full person detail card + linked tickets table — CRM-02, CRM-05
// Shows anonymized banner if person.anonymized_at is set
// "Flag as Duplicate" prepends note to person.notes (CRM-05 pragmatic impl)
// "Merge with..." opens inline search + confirmation dialog (CRM-05)
// "Anonymize Record" opens irreversible confirmation dialog (CRM-05 GDPR)

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Edit2, Flag, Merge, ShieldOff, Mail, Phone, StickyNote, Search, X } from 'lucide-react';
import { StatusBadge } from '@/components/tickets/StatusBadge';

interface TicketSummary {
  link_id: string;
  role: string;
  linked_at: string;
  ticket: {
    id: string;
    reference_id: string;
    address: string;
    status: string;
    category_name: string;
    department_name: string | null;
    substatus_label: string | null;
    assignee_name: string | null;
    created_at: string;
    updated_at: string;
  };
}

interface PersonDetailProps {
  person: {
    id: string;
    name: string | null;
    display_name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    preferred_contact: string | null;
    anonymized_at: string | null;
    merged_into_id: string | null;
    created_at: string;
    updated_at: string;
    linked_tickets: TicketSummary[];
  };
}

interface PersonSearchResult {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  anonymized_at: string | null;
  ticket_count: number;
}

export function PersonDetail({ person }: PersonDetailProps) {
  const router = useRouter();
  const isAnonymized = !!person.anonymized_at;

  // ─── Flag as Duplicate state ──────────────────────────────────────────────
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

  // ─── Merge state ──────────────────────────────────────────────────────────
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeSearchQuery, setMergeSearchQuery] = useState('');
  const [mergeSearchResults, setMergeSearchResults] = useState<PersonSearchResult[]>([]);
  const [mergeSearchLoading, setMergeSearchLoading] = useState(false);
  const [selectedMergeTarget, setSelectedMergeTarget] = useState<PersonSearchResult | null>(null);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  // ─── Anonymize state ──────────────────────────────────────────────────────
  const [showAnonymizeDialog, setShowAnonymizeDialog] = useState(false);
  const [isAnonymizing, setIsAnonymizing] = useState(false);
  const [anonymizeError, setAnonymizeError] = useState<string | null>(null);

  // ─── Toast state ─────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  // ─── Flag as Duplicate handler ────────────────────────────────────────────
  async function handleFlag() {
    if (!flagNote.trim()) return;
    setIsFlagging(true);
    setFlagError(null);
    try {
      const prefix = `DUPLICATE FLAG: ${flagNote.trim()}`;
      const newNotes = person.notes ? `${prefix}\n\n${person.notes}` : prefix;

      const res = await fetch(`/api/staff/people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? 'Failed to save flag');
      }

      setFlagSuccess(true);
      setShowFlagDialog(false);
      setFlagNote('');
      window.location.reload();
    } catch (err) {
      setFlagError(err instanceof Error ? err.message : 'Failed to save flag');
    } finally {
      setIsFlagging(false);
    }
  }

  // ─── Merge: search for target persons ────────────────────────────────────
  const searchMergeTargets = useCallback(async (q: string) => {
    if (!q.trim()) {
      setMergeSearchResults([]);
      return;
    }
    setMergeSearchLoading(true);
    try {
      const res = await fetch(`/api/staff/people?q=${encodeURIComponent(q)}&page_size=10`);
      if (!res.ok) throw new Error('Search failed');
      const json = (await res.json()) as { data: PersonSearchResult[] };
      // Exclude current person and anonymized persons
      setMergeSearchResults(
        (json.data ?? []).filter(
          (p) => p.id !== person.id && !p.anonymized_at
        )
      );
    } catch {
      setMergeSearchResults([]);
    } finally {
      setMergeSearchLoading(false);
    }
  }, [person.id]);

  function handleMergeSearchChange(q: string) {
    setMergeSearchQuery(q);
    // Simple debounce via setTimeout
    const timer = setTimeout(() => searchMergeTargets(q), 300);
    return () => clearTimeout(timer);
  }

  function selectMergeTarget(target: PersonSearchResult) {
    setSelectedMergeTarget(target);
    setShowMergeConfirm(true);
  }

  async function handleMergeConfirm() {
    if (!selectedMergeTarget) return;
    setIsMerging(true);
    setMergeError(null);
    try {
      const res = await fetch('/api/staff/people/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: person.id,
          target_id: selectedMergeTarget.id,
        }),
      });
      const json = (await res.json()) as {
        target_person_id?: string;
        tickets_relinked?: number;
        error?: { code?: string; message?: string };
      };
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Merge failed');
      }
      const ticketsCount = json.tickets_relinked ?? 0;
      showToast(
        `Merge complete — ${ticketsCount} ticket${ticketsCount === 1 ? '' : 's'} transferred`,
        'success'
      );
      setShowMergeDialog(false);
      setShowMergeConfirm(false);
      // Navigate to target person
      router.push(`/staff/people/${json.target_person_id}`);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setIsMerging(false);
    }
  }

  function closeMergeDialog() {
    setShowMergeDialog(false);
    setShowMergeConfirm(false);
    setSelectedMergeTarget(null);
    setMergeSearchQuery('');
    setMergeSearchResults([]);
    setMergeError(null);
  }

  // ─── Anonymize handler ────────────────────────────────────────────────────
  async function handleAnonymize() {
    setIsAnonymizing(true);
    setAnonymizeError(null);
    try {
      const res = await fetch(`/api/staff/people/${person.id}/anonymize`, {
        method: 'PATCH',
      });
      if (res.status === 409) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? 'This record has already been anonymized');
      }
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? 'Anonymization failed');
      }
      showToast('Record anonymized', 'success');
      setShowAnonymizeDialog(false);
      // Reload to show anonymized state
      window.location.reload();
    } catch (err) {
      setAnonymizeError(err instanceof Error ? err.message : 'Anonymization failed');
    } finally {
      setIsAnonymizing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-md border p-3 text-sm ${
            toast.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Anonymized banner */}
      {isAnonymized && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
        >
          <ShieldOff size={18} aria-hidden="true" />
          <div>
            <p className="font-medium">Anonymous Constituent</p>
            <p className="text-sm">
              This record was anonymized on{' '}
              {new Date(person.anonymized_at!).toLocaleDateString()}. Personal information has been
              removed.
            </p>
          </div>
        </div>
      )}

      {/* Contact card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold" data-testid="person-name">
              {person.display_name}
            </h2>
            {person.preferred_contact && !isAnonymized && (
              <p className="text-sm text-muted-foreground">
                Preferred contact: <span className="capitalize">{person.preferred_contact}</span>
              </p>
            )}
          </div>

          {/* Action buttons — hidden for anonymized records */}
          {!isAnonymized && (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/staff/people/${person.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
                data-testid="edit-person-btn"
              >
                <Edit2 size={14} aria-hidden="true" />
                Edit
              </Link>
              <button
                type="button"
                onClick={() => setShowFlagDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
                data-testid="flag-duplicate-btn"
              >
                <Flag size={14} aria-hidden="true" />
                Flag as Duplicate
              </button>
              <button
                type="button"
                onClick={() => setShowMergeDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
                data-testid="merge-btn"
              >
                <Merge size={14} aria-hidden="true" />
                Merge with…
              </button>
              <button
                type="button"
                onClick={() => setShowAnonymizeDialog(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                data-testid="anonymize-btn"
              >
                <ShieldOff size={14} aria-hidden="true" />
                Anonymize Record
              </button>
            </div>
          )}
        </div>

        {/* Contact fields */}
        {!isAnonymized && (
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {person.email && (
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-muted-foreground" aria-hidden="true" />
                <dt className="sr-only">Email</dt>
                <dd className="text-sm">{person.email}</dd>
              </div>
            )}
            {person.phone && (
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-muted-foreground" aria-hidden="true" />
                <dt className="sr-only">Phone</dt>
                <dd className="text-sm">{person.phone}</dd>
              </div>
            )}
            {person.notes && (
              <div className="col-span-full flex gap-2">
                <StickyNote size={15} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="sr-only">Notes</dt>
                  <dd className="whitespace-pre-wrap text-sm text-muted-foreground">{person.notes}</dd>
                </div>
              </div>
            )}
          </dl>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Record created {new Date(person.created_at).toLocaleDateString()}
          {' · '}
          Updated {new Date(person.updated_at).toLocaleDateString()}
        </p>
      </div>

      {/* Duplicate flag success toast */}
      {flagSuccess && (
        <div role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Duplicate flag saved successfully.
        </div>
      )}

      {/* ─── Flag as Duplicate dialog ─────────────────────────────────────── */}
      {showFlagDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="flag-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="flag-dialog"
        >
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h3 id="flag-dialog-title" className="text-lg font-semibold">
              Flag as Potential Duplicate
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a note describing why you think this may be a duplicate. The note will be prepended to the
              person's existing notes.
            </p>
            <textarea
              rows={3}
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder="e.g. Same contact as record abc123 — same email and phone"
              aria-label="Duplicate flag note"
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            {flagError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {flagError}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowFlagDialog(false); setFlagNote(''); setFlagError(null); }}
                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFlag}
                disabled={isFlagging || !flagNote.trim()}
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {isFlagging ? 'Saving…' : 'Save Flag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Merge dialog ─────────────────────────────────────────────────── */}
      {showMergeDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="merge-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="merge-dialog"
        >
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <h3 id="merge-dialog-title" className="text-lg font-semibold">
                Merge {person.display_name}
              </h3>
              <button
                type="button"
                onClick={closeMergeDialog}
                aria-label="Close merge dialog"
                className="rounded-md p-1 hover:bg-accent"
              >
                <X size={16} />
              </button>
            </div>

            {!showMergeConfirm ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search for the person to merge into. All linked tickets will be transferred to the
                  selected person.
                </p>
                <div className="relative mt-3">
                  <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" aria-hidden="true" />
                  <input
                    type="search"
                    value={mergeSearchQuery}
                    onChange={(e) => handleMergeSearchChange(e.target.value)}
                    placeholder="Search by name, email, or phone…"
                    aria-label="Search for merge target"
                    data-testid="merge-search-input"
                    className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {mergeSearchLoading && (
                  <p className="mt-2 text-sm text-muted-foreground">Searching…</p>
                )}

                {!mergeSearchLoading && mergeSearchResults.length > 0 && (
                  <ul
                    role="listbox"
                    aria-label="Search results"
                    className="mt-2 max-h-48 overflow-y-auto rounded-md border border-input"
                  >
                    {mergeSearchResults.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => selectMergeTarget(result)}
                          data-testid={`merge-target-${result.id}`}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <span>
                            <span className="font-medium">{result.name ?? 'Unnamed'}</span>
                            {result.email && (
                              <span className="ml-2 text-muted-foreground">{result.email}</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {result.ticket_count} ticket{result.ticket_count === 1 ? '' : 's'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {!mergeSearchLoading && mergeSearchQuery.trim() && mergeSearchResults.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">No matching persons found.</p>
                )}

                {mergeError && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {mergeError}
                  </p>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={closeMergeDialog}
                    className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              /* Merge confirmation step */
              <>
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <p className="font-medium">Confirm merge — this cannot be undone</p>
                  <p className="mt-1">
                    Merge{' '}
                    <strong>{person.display_name}</strong> into{' '}
                    <strong>{selectedMergeTarget?.name ?? 'Unnamed'}</strong>?
                    All linked tickets will be transferred to {selectedMergeTarget?.name ?? 'the target person'}.
                    This cannot be undone.
                  </p>
                </div>

                {mergeError && (
                  <p role="alert" className="mt-2 text-sm text-destructive">
                    {mergeError}
                  </p>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowMergeConfirm(false); setMergeError(null); }}
                    className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleMergeConfirm}
                    disabled={isMerging}
                    data-testid="confirm-merge-btn"
                    className="inline-flex h-9 items-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isMerging ? 'Merging…' : 'Confirm Merge'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Anonymize AlertDialog ────────────────────────────────────────── */}
      {showAnonymizeDialog && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="anonymize-dialog-title"
          aria-describedby="anonymize-dialog-desc"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="anonymize-dialog"
        >
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <ShieldOff size={20} className="text-destructive" aria-hidden="true" />
              </div>
              <h3 id="anonymize-dialog-title" className="text-lg font-semibold">
                Anonymize Record
              </h3>
            </div>
            <p id="anonymize-dialog-desc" className="mt-3 text-sm text-muted-foreground">
              All personal information will be permanently removed. This action cannot be undone.
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Name, email, phone, and notes will be erased</li>
              <li>• Ticket links will be preserved (anonymized contact)</li>
              <li>• This complies with GDPR erasure requests</li>
            </ul>

            {anonymizeError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {anonymizeError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAnonymizeDialog(false); setAnonymizeError(null); }}
                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAnonymize}
                disabled={isAnonymizing}
                data-testid="confirm-anonymize-btn"
                className="inline-flex h-9 items-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {isAnonymizing ? 'Anonymizing…' : 'Anonymize Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linked tickets table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h3 className="font-medium">
            Linked Tickets{' '}
            <span className="text-muted-foreground font-normal">
              ({person.linked_tickets.length})
            </span>
          </h3>
        </div>

        {person.linked_tickets.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            No tickets linked to this person yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Reference</th>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {person.linked_tickets.map((lt) => (
                  <tr key={lt.link_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/staff/tickets/${lt.ticket.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {lt.ticket.reference_id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lt.ticket.category_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={lt.ticket.status}
                        substatusLabel={lt.ticket.substatus_label}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 capitalize">
                        {lt.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(lt.ticket.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
