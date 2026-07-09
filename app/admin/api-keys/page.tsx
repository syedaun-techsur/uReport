'use client';
// app/admin/api-keys/page.tsx
// Admin API key management page — generate keys (plaintext once), revoke
// ADMIN-06: API key management
// T-06-07: plaintext key shown once in modal; never exposed in list view

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ApiKeyModal } from '@/components/admin/ApiKeyModal';

interface ApiKey {
  id: string;
  label: string;
  scope: 'read' | 'write';
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  status: 'active' | 'revoked';
}

export default function AdminApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate form state
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Plaintext key modal
  const [modalKey, setModalKey] = useState<{ plaintext: string; label: string } | null>(null);

  // Revocation confirm
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeLabel, setRevokeLabel] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/api-keys');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load API keys');
      }
      const json = (await res.json()) as ApiKey[];
      setKeys(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, scope }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { code?: string; message?: string } };
        if (json.error?.code === 'DUPLICATE_LABEL') {
          setFormError('An active API key with this label already exists.');
        } else {
          setFormError(json.error?.message ?? 'Failed to generate API key.');
        }
        return;
      }

      const json = (await res.json()) as {
        id: string;
        label: string;
        scope: string;
        plaintext_key: string;
        created_at: string;
      };

      // Show plaintext key modal ONCE — T-06-07
      setModalKey({ plaintext: json.plaintext_key, label: json.label });
      setShowForm(false);
      setLabel('');
      setScope('read');
      void fetchKeys();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeId) return;
    setIsRevoking(true);
    try {
      const res = await fetch(`/api/admin/api-keys/${revokeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        showToast(json.error?.message ?? 'Failed to revoke API key.', 'error');
        return;
      }

      setRevokeId(null);
      showToast(`API key "${revokeLabel}" has been revoked.`);
      void fetchKeys();
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Key Management</h1>
        <button
          type="button"
          data-testid="generate-key-btn"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          + Generate Key
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="alert"
          data-testid="toast"
          className={`mb-4 p-3 text-sm rounded border ${
            toast.type === 'error'
              ? 'text-red-700 bg-red-50 border-red-200'
              : 'text-green-700 bg-green-50 border-green-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Generate form (inline panel) */}
      {showForm && (
        <div className="mb-6 p-6 border rounded-lg bg-card shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Generate New API Key</h2>
          <form onSubmit={handleGenerate} className="flex flex-col gap-4 max-w-sm">
            {formError && (
              <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
                {formError}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label htmlFor="key-label" className="text-sm font-medium">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                id="key-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                maxLength={100}
                className="px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Mobile App Integration"
                data-testid="key-label-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="key-scope" className="text-sm font-medium">
                Scope <span className="text-red-500">*</span>
              </label>
              <select
                id="key-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value as 'read' | 'write')}
                className="px-3 py-2 border rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="key-scope-select"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isGenerating}
                data-testid="generate-key-submit"
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
              >
                {isGenerating ? 'Generating…' : 'Generate Key'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                  setLabel('');
                }}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Revocation confirm dialog */}
      {revokeId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="bg-background border rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-3">Revoke API Key</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to revoke the key <strong>&quot;{revokeLabel}&quot;</strong>?{' '}
              This action cannot be undone. Any integrations using this key will immediately
              receive 401 errors.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleRevoke()}
                disabled={isRevoking}
                data-testid="confirm-revoke-btn"
                className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50"
              >
                {isRevoking ? 'Revoking…' : 'Revoke Key'}
              </button>
              <button
                type="button"
                onClick={() => setRevokeId(null)}
                className="px-4 py-2 text-sm border rounded hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plaintext key modal — shown ONCE after generation (T-06-07) */}
      {modalKey && (
        <ApiKeyModal
          plaintextKey={modalKey.plaintext}
          label={modalKey.label}
          onDismiss={() => setModalKey(null)}
        />
      )}

      {isLoading && <p className="text-muted-foreground text-sm">Loading API keys…</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {!isLoading && !error && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm" data-testid="api-keys-table">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Label</th>
                <th className="px-4 py-3 text-left font-medium">Scope</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-left font-medium">Last Used</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key.id}
                  className={`border-t ${key.status === 'revoked' ? 'opacity-50' : 'hover:bg-muted/50'}`}
                >
                  <td className="px-4 py-3 font-medium">{key.label}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        key.scope === 'write'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {key.scope}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(key.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`key-status-${key.id}`}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        key.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {key.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {key.status === 'active' && (
                      <button
                        type="button"
                        data-testid={`revoke-key-${key.id}`}
                        onClick={() => {
                          setRevokeId(key.id);
                          setRevokeLabel(key.label);
                        }}
                        className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No API keys found. Generate one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
