'use client';
// app/staff/people/[id]/edit/_EditPersonClient.tsx
// Client component for editing person — receives pre-fetched person data
// Handles form submission and redirect

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PersonForm } from '@/components/crm/PersonForm';
import type { CreatePersonInput } from '@/schemas/person';

interface EditPersonClientProps {
  person: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    preferred_contact: string | null;
    anonymized_at: Date | null;
  };
}

export default function EditPersonClient({ person }: EditPersonClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: CreatePersonInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/people/${person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? 'Failed to update person');
      }

      router.push(`/staff/people/${person.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update person');
      setIsSubmitting(false);
    }
  }

  // Build default values — convert null to undefined for react-hook-form
  const defaultValues: Partial<CreatePersonInput> = {
    name: person.name ?? undefined,
    email: person.email ?? undefined,
    phone: person.phone ?? undefined,
    notes: person.notes ?? undefined,
    preferred_contact:
      (person.preferred_contact as 'email' | 'phone' | 'none' | null) ?? undefined,
  };

  return (
    <main className="p-6">
      <div className="mb-6">
        <Link
          href={`/staff/people/${person.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Back to Person
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">Edit Person</h1>

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
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </main>
  );
}
