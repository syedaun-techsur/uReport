// app/(public)/tickets/[id]/confirm/page.tsx
// Confirmation page shown after successful ticket submission (TechArch §2.1)
// Receives ticket ID from the URL path; reference_id and category_name via query params
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reference_id?: string; category_name?: string }>;
}

export default async function ConfirmPage({ params, searchParams }: Props) {
  const { id: ticketId } = await params;
  const { reference_id, category_name } = await searchParams;
  const referenceId = reference_id ?? ticketId;
  const categoryName = category_name ?? 'your issue';

  const trackingUrl = `/tickets/${ticketId}`;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4" role="img" aria-label="checkmark">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for reporting {categoryName}. Your ticket has been created.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 font-medium uppercase tracking-wide mb-1">Your Ticket ID</p>
          <p className="text-2xl font-mono font-bold text-blue-900 select-all">{referenceId}</p>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Save this ID to check on your report&apos;s status at any time.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={trackingUrl}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            View Ticket Status →
          </Link>
          <Link
            href="/"
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            Report Another Issue
          </Link>
        </div>
      </div>
    </main>
  );
}
