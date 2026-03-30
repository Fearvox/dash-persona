'use client';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DimensionSwitcherProps {
  value: string;
  onChange: (dim: string) => void;
  dimensions: Array<{ key: string; label: string }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DimensionSwitcher({
  value,
  onChange,
  dimensions,
}: DimensionSwitcherProps) {
  return (
    <div className="flex gap-1.5" role="tablist" aria-label="Dimension selector">
      {dimensions.map((dim) => {
        const isSelected = dim.key === value;
        return (
          <button
            key={dim.key}
            type="button"
            role="tab"
            onClick={() => onChange(dim.key)}
            aria-selected={isSelected}
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
            {dim.label}
          </button>
        );
      })}
    </div>
  );
}
