'use client';
// components/admin/ApiKeyModal.tsx
// Displays the plaintext API key ONCE after generation.
// T-06-07: plaintext_key is shown once; user must copy it; it won't be shown again.

import { useState } from 'react';

interface ApiKeyModalProps {
  plaintextKey: string;
  label: string;
  onDismiss: () => void;
}

export function ApiKeyModal({ plaintextKey, label, onDismiss }: ApiKeyModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(plaintextKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard
      const textarea = document.createElement('textarea');
      textarea.value = plaintextKey;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apikey-modal-title"
      data-testid="apikey-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="bg-background border rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <h2 id="apikey-modal-title" className="text-lg font-semibold mb-2">
          API Key Generated
        </h2>
        <p className="text-sm text-muted-foreground mb-1">
          Label: <strong>{label}</strong>
        </p>

        <div
          role="alert"
          className="mt-3 mb-4 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded"
        >
          ⚠️ <strong>This key will NOT be shown again.</strong> Copy it now and store it securely.
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            API Key
          </label>
          <div className="mt-1 flex items-center gap-2">
            <code
              data-testid="plaintext-key"
              className="flex-1 font-mono text-xs bg-muted px-3 py-2 rounded border break-all"
            >
              {plaintextKey}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              data-testid="copy-key-btn"
              className="px-3 py-2 text-sm font-medium border rounded hover:bg-muted transition-colors whitespace-nowrap"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          data-testid="apikey-modal-dismiss"
          className="w-full px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          I&apos;ve Copied the Key — Close
        </button>
      </div>
    </div>
  );
}
