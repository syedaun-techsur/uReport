// app/staff/people/[id]/page.tsx
// Person detail page — CRM-02, CRM-05
// Server component: fetches person data + passes to PersonDetail client component
// Next.js 15: params typed as Promise<{ id: string }>

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PersonDetail } from '@/components/crm/PersonDetail';

interface PersonDetailPageProps {
  params: Promise<{ id: string }>;
}

async function fetchPerson(id: string) {
  // Server-side fetch — use internal URL since this is a server component
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  // We need to use the Prisma client directly in server components to avoid
  // session-cookie issues in self-fetch. Import dynamically to keep this server-only.
  const { prisma } = await import('@/lib/prisma');

  const person = await prisma.person.findFirst({
    where: { id, deleted_at: null },
    include: {
      tickets: {
        include: {
          ticket: {
            include: {
              category: { select: { name: true } },
              department: { select: { name: true } },
              substatus: { select: { label: true } },
              assignee: { select: { username: true } },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!person) return null;

  const isAnonymized = !!person.anonymized_at;

  return {
    id: person.id,
    name: isAnonymized ? null : person.name,
    display_name: isAnonymized ? 'Anonymous Constituent' : (person.name ?? 'Unknown'),
    email: isAnonymized ? null : person.email,
    phone: isAnonymized ? null : person.phone,
    notes: isAnonymized ? null : person.notes,
    preferred_contact: isAnonymized ? null : person.preferred_contact,
    anonymized_at: person.anonymized_at?.toISOString() ?? null,
    merged_into_id: person.merged_into_id,
    created_at: person.created_at.toISOString(),
    updated_at: person.updated_at.toISOString(),
    linked_tickets: person.tickets.map((tp) => ({
      link_id: tp.id,
      role: tp.role,
      linked_at: tp.created_at.toISOString(),
      ticket: {
        id: tp.ticket.id,
        reference_id: tp.ticket.reference_id,
        address: tp.ticket.address,
        status: tp.ticket.status as string,
        category_name: tp.ticket.category.name,
        department_name: tp.ticket.department?.name ?? null,
        substatus_label: tp.ticket.substatus?.label ?? null,
        assignee_name: tp.ticket.assignee?.username ?? null,
        created_at: tp.ticket.created_at.toISOString(),
        updated_at: tp.ticket.updated_at.toISOString(),
      },
    })),
  };
}

export default async function PersonDetailPage({ params }: PersonDetailPageProps) {
  const { id } = await params;
  const person = await fetchPerson(id);

  if (!person) notFound();

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
      <PersonDetail person={person} />
    </main>
  );
}
