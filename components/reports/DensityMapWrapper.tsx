'use client';

// Client wrapper for the Leaflet density map. The dynamic import with
// `ssr: false` must live in a Client Component — Next.js 15 (Turbopack)
// disallows `ssr: false` in `next/dynamic` when called from a Server
// Component, which is what app/staff/reports/page.tsx is.
import dynamic from 'next/dynamic';

const DensityMap = dynamic(() => import('@/components/reports/DensityMap'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-muted rounded-lg" />,
});

interface DensityMapWrapperProps {
  startDate: string;
  endDate: string;
  statusFilter: 'open' | 'closed' | 'all';
}

export default function DensityMapWrapper(props: DensityMapWrapperProps) {
  return <DensityMap {...props} />;
}
