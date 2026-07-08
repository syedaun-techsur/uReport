import { notFound } from 'next/navigation';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

interface TicketResponse {
  id: string;
  body: string;
  created_at: string;
}

interface TicketDetail {
  id: string;
  reference_id: string;
  service_code: string;
  status: string;
  substatus: string | null;
  category: { id: string; name: string; service_code: string };
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
  responses: TicketResponse[];
}

async function getTicket(id: string): Promise<TicketDetail | null> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/tickets/${id}/public`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch ticket');
  return res.json() as Promise<TicketDetail>;
}

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  const statusColors: Record<string, string> = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    closed: 'bg-green-100 text-green-800',
    archived: 'bg-gray-100 text-gray-700',
  };
  const statusLabel = ticket.status
    .replace('_', ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            ← Report a new issue
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500 font-mono mb-1">#{ticket.reference_id}</p>
              <h1 className="text-xl font-bold text-gray-900">{ticket.category.name}</h1>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[ticket.status] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {statusLabel}
              </span>
              {ticket.substatus && (
                <span className="text-xs text-gray-500">{ticket.substatus}</span>
              )}
            </div>
          </div>

          <p className="text-gray-700 mb-4">{ticket.description}</p>

          {ticket.address && (
            <p className="text-sm text-gray-500 mb-1">
              <span className="font-medium">Location:</span> {ticket.address}
            </p>
          )}

          <p className="text-sm text-gray-400 mt-4">
            Submitted{' '}
            {new Date(ticket.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {ticket.responses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Staff Responses</h2>
            <div className="space-y-4">
              {ticket.responses.map((r) => (
                <div key={r.id} className="border-l-4 border-blue-400 pl-4">
                  <p className="text-gray-700">{r.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
