// app/staff/reports/page.tsx
import { Suspense } from 'react';
import DateRangePicker from '@/components/reports/DateRangePicker';
import SummaryCards from '@/components/reports/SummaryCards';
import VolumeChart from '@/components/reports/VolumeChart';
import StatusBreakdown from '@/components/reports/StatusBreakdown';
import ResolutionTimeChart from '@/components/reports/ResolutionTimeChart';
import DensityMap from '@/components/reports/DensityMapWrapper';

interface ReportsPageProps {
  searchParams: Promise<{ preset?: string; startDate?: string; endDate?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;

  // Resolve date range from URL params
  const now = new Date();
  const preset = params.preset ?? '30d';
  let endDate = params.endDate ? new Date(params.endDate) : now;
  let startDate: Date;
  if (params.startDate) {
    startDate = new Date(params.startDate);
  } else {
    const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30;
    startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  }

  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports &amp; Metrics</h1>
        <DateRangePicker currentPreset={preset} startDate={startISO} endDate={endISO} />
      </div>

      <Suspense fallback={<div className="text-muted-foreground text-sm">Loading summary…</div>}>
        <SummaryCards startDate={startISO} endDate={endISO} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
          <VolumeChart startDate={startISO} endDate={endISO} />
        </Suspense>
        <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
          <StatusBreakdown startDate={startISO} endDate={endISO} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
        <ResolutionTimeChart startDate={startISO} endDate={endISO} />
      </Suspense>

      <div className="rounded-lg border overflow-hidden" style={{ height: 400 }}>
        <DensityMap startDate={startISO} endDate={endISO} statusFilter="all" />
      </div>
    </div>
  );
}
