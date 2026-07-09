'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DateRangePickerProps {
  currentPreset: string;
  startDate: string;
  endDate: string;
}

const PRESETS = [
  { label: 'Last 7d', value: '7d' },
  { label: 'Last 30d', value: '30d' },
  { label: 'Last 90d', value: '90d' },
] as const;

export default function DateRangePicker({ currentPreset }: DateRangePickerProps) {
  const router = useRouter();

  const applyPreset = (preset: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('preset', preset);
    url.searchParams.delete('startDate');
    url.searchParams.delete('endDate');
    router.push(url.pathname + '?' + url.searchParams.toString());
  };

  const applyCustomRange = (start: string, end: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('startDate', new Date(start).toISOString());
    url.searchParams.set('endDate', new Date(end).toISOString());
    url.searchParams.delete('preset');
    router.push(url.pathname + '?' + url.searchParams.toString());
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map(p => (
        <Button
          key={p.value}
          size="sm"
          variant={currentPreset === p.value ? 'default' : 'outline'}
          onClick={() => applyPreset(p.value)}
          data-testid={`preset-${p.value}`}
        >
          {p.label}
        </Button>
      ))}
      <input
        type="date"
        className="border rounded px-2 py-1 text-sm"
        data-testid="custom-start-date"
        onChange={e => {
          const endEl = document.querySelector<HTMLInputElement>('[data-testid="custom-end-date"]');
          if (endEl?.value) applyCustomRange(e.target.value, endEl.value);
        }}
      />
      <span className="text-muted-foreground text-sm">to</span>
      <input
        type="date"
        className="border rounded px-2 py-1 text-sm"
        data-testid="custom-end-date"
        onChange={e => {
          const startEl = document.querySelector<HTMLInputElement>('[data-testid="custom-start-date"]');
          if (startEl?.value) applyCustomRange(startEl.value, e.target.value);
        }}
      />
    </div>
  );
}
