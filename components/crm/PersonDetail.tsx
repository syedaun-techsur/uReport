'use client';
// components/crm/PersonDetail.tsx
// Full person detail card + linked tickets table — CRM-02, CRM-05
// Shows anonymized banner if person.anonymized_at is set
// "Flag as Duplicate" prepends note to person.notes (CRM-05 pragmatic impl)

import { useState } from 'react';
import Link from 'next/link';
import { Edit2, Flag, Merge, ShieldOff, Mail, Phone, StickyNote } from 'lucide-react';
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

export function PersonDetail({ person }: PersonDetailProps) {
  const isAnonymized = !!person.anonymized_at;
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

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
      // Reload to show updated notes
      window.location.reload();
    } catch (err) {
      setFlagError(err instanceof Error ? err.message : 'Failed to save flag');
    } finally {
      setIsFlagging(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
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
            <div className="flex items-center gap-2">
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
              <Link
                href={`/staff/people/${person.id}/merge`}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                data-testid="merge-btn"
              >
                <Merge size={14} aria-hidden="true" />
                Merge with…
              </Link>
              <Link
                href={`/staff/people/${person.id}/anonymize`}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                data-testid="anonymize-btn"
              >
                <ShieldOff size={14} aria-hidden="true" />
                Anonymize Record
              </Link>
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

      {/* Flag as Duplicate dialog */}
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
