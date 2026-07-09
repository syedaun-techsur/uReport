// app/staff/people/page.tsx
// CRM people search page — CRM-01
// Server component shell; delegates search UX to PersonSearchPanel (client component)

import { PersonSearchPanel } from '@/components/crm/PersonSearchPanel';

export const metadata = {
  title: 'People — uReport Staff',
};

export default function StaffPeoplePage() {
  return (
    <main className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Constituent Records</h1>
      </div>
      <PersonSearchPanel />
    </main>
  );
}
