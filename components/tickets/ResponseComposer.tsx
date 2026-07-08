'use client';
import { useState, useEffect, useRef } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface ResponseTemplate {
  id: string;
  name: string;
  body: string;
  category_id: string | null;
  department_id: string | null;
}

interface ResponseComposerProps {
  ticketId: string;
  categoryId: string;
  departmentId: string | null;
  referenceId: string;
  address: string;
  categoryName: string;
  onSuccess: () => void;
}

const MAX_CHARS = 10000;

// ─── Placeholder Substitution ──────────────────────────────────────────────
// Client-side template placeholder substitution per FRD §F04

function substituteTemplatePlaceholders(
  body: string,
  referenceId: string,
  address: string,
  categoryName: string,
): string {
  return body
    .replace(/\{\{ticket_id\}\}/g, referenceId)
    .replace(/\{\{address\}\}/g, address)
    .replace(/\{\{category_name\}\}/g, categoryName);
}

// ─── ResponseComposer Component ────────────────────────────────────────────

export function ResponseComposer({
  ticketId,
  categoryId,
  departmentId,
  referenceId,
  address,
  categoryName,
  onSuccess,
}: ResponseComposerProps) {
  const [isPublic, setIsPublic] = useState(false); // default: internal note
  const [body, setBody] = useState('');
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch templates on mount
  useEffect(() => {
    const params = new URLSearchParams({ category_id: categoryId });
    if (departmentId) params.set('department_id', departmentId);

    fetch(`/api/staff/response-templates?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { data: ResponseTemplate[] }) => {
        setTemplates(data.data ?? []);
      })
      .catch(() => {
        // Non-fatal: template picker is a convenience, not a requirement
      });
  }, [categoryId, departmentId]);

  // Handle template selection — insert substituted body into textarea
  function handleTemplateSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);

    if (!templateId) return;

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const substituted = substituteTemplatePlaceholders(
      template.body,
      referenceId,
      address,
      categoryName,
    );

    setBody(substituted);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (body.trim().length === 0) {
      setError('Response body cannot be empty.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          is_public: isPublic,
          ...(selectedTemplateId ? { template_id: selectedTemplateId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const code = (data as { error?: { code?: string; message?: string } })?.error?.code;
        if (code === 'EMPTY_RESPONSE') {
          setError('Response body cannot be empty.');
        } else {
          setError(
            (data as { error?: { message?: string } })?.error?.message ?? 'Failed to post response.',
          );
        }
        return;
      }

      // Success: clear form and trigger parent refetch
      setBody('');
      setSelectedTemplateId('');
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = MAX_CHARS - body.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Internal / Public toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsPublic(false)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            !isPublic
              ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Internal note
        </button>
        <button
          type="button"
          onClick={() => setIsPublic(true)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            isPublic
              ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Public response
        </button>
      </div>

      {/* Template picker */}
      {templates.length > 0 && (
        <select
          value={selectedTemplateId}
          onChange={handleTemplateSelect}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Insert template"
        >
          <option value="">Insert template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      {/* Textarea */}
      <div>
        <textarea
          ref={textareaRef}
          data-testid="response-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={MAX_CHARS}
          rows={6}
          placeholder={
            isPublic
              ? 'Type a public response visible to the constituent…'
              : 'Type an internal note (staff-only)…'
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
          disabled={submitting}
        />
        <p className={`mt-1 text-right text-xs ${remaining < 200 ? 'text-red-600' : 'text-gray-400'}`}>
          {remaining.toLocaleString()} characters remaining
        </p>
      </div>

      {/* Inline error */}
      {error && (
        <p
          data-testid="response-error"
          className="text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="response-submit"
          disabled={submitting || body.trim().length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? 'Posting…'
            : isPublic
              ? 'Post Response'
              : 'Post Note'}
        </button>
      </div>
    </form>
  );
}
