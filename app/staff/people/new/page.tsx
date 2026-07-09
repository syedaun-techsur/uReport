'use client';
// app/staff/people/new/page.tsx
// Create new Person record — CRM-04
// Client component: renders PersonForm, POSTs to /api/staff/people, redirects to detail

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PersonForm } from '@/components/crm/PersonForm';
import type { CreatePersonInput } from '@/schemas/person';

export default function NewPersonPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreatePersonInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? 'Failed to create person');
      }

      const created = (await res.json()) as { id: string };
      router.push(`/staff/people/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create person');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="p-6">
      <div className="mb-6">
        <Link
          href="/staff/people"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Back to People
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">Create New Person</h1>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="rounded-lg border bg-card p-6">
          <PersonForm
            onSubmit={handleSubmit}
            submitLabel="Create Person"
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </main>
  );
}
