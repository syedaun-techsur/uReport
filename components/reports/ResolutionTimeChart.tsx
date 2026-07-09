'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ResolutionTimeChartProps {
  startDate: string;
  endDate: string;
}

interface ResolutionRow {
  group_id: string;
  group_name: string;
  mean_hours: number;
  median_hours: number;
  count: number;
}

export default function ResolutionTimeChart({ startDate, endDate }: ResolutionTimeChartProps) {
  const [rows, setRows] = useState<ResolutionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&group_by=department`;
    fetch(`/api/staff/reports/resolution-time?${qs}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [startDate, endDate]);

  if (loading) return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  if (!rows.length) return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No closed tickets in this period</div>;

  return (
    <div className="rounded-lg border p-4" data-testid="resolution-time-chart">
      <h2 className="text-base font-semibold mb-4">Avg Resolution Time by Department (hours)</h2>
      <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 40)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, left: 80, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" unit="h" />
          <YAxis type="category" dataKey="group_name" tick={{ fontSize: 12 }} width={72} />
          <Tooltip formatter={(v: number) => [`${v}h`, '']} />
          <Legend />
          <Bar dataKey="mean_hours" name="Mean" fill="#6366f1" />
          <Bar dataKey="median_hours" name="Median" fill="#a5b4fc" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
