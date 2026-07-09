'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VolumeChartProps {
  startDate: string;
  endDate: string;
}

interface VolumeRow {
  period: string;
  category_id: string;
  category_name: string;
  count: number;
}

export default function VolumeChart({ startDate, endDate }: VolumeChartProps) {
  const [rows, setRows] = useState<VolumeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&interval=day`;
    fetch(`/api/staff/reports/volume-by-category?${qs}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [startDate, endDate]);

  // Pivot: group by period, accumulate count per category_name
  const categories = [...new Set(rows.map(r => r.category_name))];
  const byPeriod = rows.reduce<Record<string, Record<string, number>>>((acc, r) => {
    acc[r.period] = acc[r.period] ?? {};
    acc[r.period][r.category_name] = (acc[r.period][r.category_name] ?? 0) + r.count;
    return acc;
  }, {});
  const chartData = Object.entries(byPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, counts]) => ({ period: period.slice(0, 10), ...counts }));

  const COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#f97316','#14b8a6'];

  if (loading) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  if (!chartData.length) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>;

  return (
    <div className="rounded-lg border p-4" data-testid="volume-chart">
      <h2 className="text-base font-semibold mb-4">Volume by Category</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          {categories.map((cat, i) => (
            <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[i % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
