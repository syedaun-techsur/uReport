'use client';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

interface StatusBreakdownProps {
  startDate: string;
  endDate: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: '#6366f1',
  in_progress: '#f59e0b',
  closed: '#10b981',
  archived: '#9ca3af',
};

export default function StatusBreakdown({ startDate, endDate }: StatusBreakdownProps) {
  const router = useRouter();
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    fetch(`/api/staff/reports/status-breakdown?${qs}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: { open: number; in_progress: number; closed: number; archived: number }) => {
        setData([
          { name: 'Open', value: d.open },
          { name: 'In Progress', value: d.in_progress },
          { name: 'Closed', value: d.closed },
          { name: 'Archived', value: d.archived },
        ]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [startDate, endDate]);

  const handleSegmentClick = (entry: { name: string }) => {
    const statusMap: Record<string, string> = {
      Open: 'open',
      'In Progress': 'in_progress',
      Closed: 'closed',
      Archived: 'archived',
    };
    const status = statusMap[entry.name];
    if (status) router.push(`/staff/tickets?status=${status}`);
  };

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  if (!data.some(d => d.value > 0)) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>;

  return (
    <div className="rounded-lg border p-4" data-testid="status-breakdown">
      <h2 className="text-base font-semibold mb-4">Status Breakdown</h2>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            onClick={handleSegmentClick}
            style={{ cursor: 'pointer' }}
          >
            {data.map(entry => {
              const statusKey = entry.name === 'In Progress' ? 'in_progress' : entry.name.toLowerCase();
              return <Cell key={entry.name} fill={STATUS_COLORS[statusKey] ?? '#6b7280'} />;
            })}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
