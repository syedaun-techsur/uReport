'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SummaryCardsProps {
  startDate: string;
  endDate: string;
}

export default function SummaryCards({ startDate, endDate }: SummaryCardsProps) {
  const [breakdown, setBreakdown] = useState<{ open: number; in_progress: number; closed: number; archived: number } | null>(null);
  const [avgResolution, setAvgResolution] = useState<number | null>(null);

  useEffect(() => {
    const qs = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    fetch(`/api/staff/reports/status-breakdown?${qs}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(setBreakdown)
      .catch(() => {});

    fetch(`/api/staff/reports/resolution-time?${qs}&group_by=category`, { cache: 'no-store' })
      .then(r => r.json())
      .then((rows: Array<{ mean_hours: number; count: number }>) => {
        if (!rows.length) { setAvgResolution(0); return; }
        const totalCount = rows.reduce((s, r) => s + r.count, 0);
        const weightedMean = rows.reduce((s, r) => s + r.mean_hours * r.count, 0) / totalCount;
        setAvgResolution(Math.round(weightedMean * 10) / 10);
      })
      .catch(() => {});
  }, [startDate, endDate]);

  const total = breakdown
    ? breakdown.open + breakdown.in_progress + breakdown.closed + breakdown.archived
    : null;

  const cards = [
    { title: 'Total Tickets', value: total, testid: 'card-total' },
    { title: 'Open', value: breakdown?.open ?? null, testid: 'card-open' },
    { title: 'Closed', value: breakdown?.closed ?? null, testid: 'card-closed' },
    { title: 'Avg Resolution', value: avgResolution !== null ? `${avgResolution}h` : null, testid: 'card-avg-resolution' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.title} data-testid={c.testid}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {c.value !== null ? c.value : <span className="animate-pulse text-muted-foreground">—</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
