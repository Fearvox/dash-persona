'use client';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TimeRangeSelectorProps {
  value: number;
  onChange: (hours: number) => void;
  options?: number[];
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS = [24, 168, 720, 2160];

const HOUR_LABELS: Record<number, string> = {
  24: '24h',
  168: '7d',
  720: '30d',
  2160: '90d',
};

function getLabel(hours: number): string {
  if (HOUR_LABELS[hours]) return HOUR_LABELS[hours];
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TimeRangeSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
}: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Time range">
      {options.map((hours) => {
        const isSelected = hours === value;
        return (
          <button
            key={hours}
            type="button"
            onClick={() => onChange(hours)}
            aria-pressed={isSelected}
            className="rounded-full px-3 py-1 text-xs font-medium cursor-pointer transition-[background,color] duration-150 ease-in-out"
            style={{
              background: isSelected
                ? 'var(--accent-green)'
                : 'var(--bg-secondary)',
              color: isSelected
                ? 'var(--bg-primary)'
                : 'var(--text-secondary)',
              border: isSelected
                ? '1px solid var(--accent-green)'
                : '1px solid var(--border-subtle)',
            }}
          >
            {getLabel(hours)}
          </button>
        );
      })}
    </div>
  );
}
