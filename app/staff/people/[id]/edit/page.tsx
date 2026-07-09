// app/staff/people/[id]/edit/page.tsx
// Edit Person contact details — CRM-04
// Server component fetches person; client-side form PATCHes and redirects
// Next.js 15: params typed as Promise<{ id: string }>

import { notFound } from 'next/navigation';
import EditPersonClient from './_EditPersonClient';

interface EditPersonPageProps {
  params: Promise<{ id: string }>;
}

async function fetchPersonForEdit(id: string) {
  const { prisma } = await import('@/lib/prisma');

  const person = await prisma.person.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notes: true,
      preferred_contact: true,
      anonymized_at: true,
    },
  });

  return person;
}

export default async function EditPersonPage({ params }: EditPersonPageProps) {
  const { id } = await params;
  const person = await fetchPersonForEdit(id);

  if (!person) notFound();

  // Block editing anonymized records at the page level
  if (person.anonymized_at) {
    return (
      <main className="p-6">
        <div className="mx-auto max-w-2xl">
          <div
            role="alert"
            className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800"
          >
            <p className="font-medium">Cannot Edit Anonymous Record</p>
            <p className="mt-1 text-sm">
              This person record has been anonymized and can no longer be edited.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <EditPersonClient person={person} />;
}
