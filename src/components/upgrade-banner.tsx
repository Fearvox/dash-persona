import Link from "next/link";

interface UpgradeBannerProps {
  compact?: boolean;
}

export function UpgradeBanner({ compact = false }: UpgradeBannerProps) {
  if (compact) {
    return (
      <Link
        href="/install"
        className="block rounded-lg border border-[rgba(210,200,126,0.15)] bg-[rgba(210,200,126,0.04)] px-4 py-3 hover:bg-[rgba(210,200,126,0.08)] transition-colors"
      >
        <p className="text-xs font-medium text-[var(--accent-yellow)] mb-1">
          Unlock full analysis
        </p>
        <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
          Install the CLI to collect real-time data from your Creator Centers.
        </p>
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-[rgba(210,200,126,0.15)] bg-[rgba(210,200,126,0.04)] px-4 py-3 flex items-start gap-3">
      <div className="shrink-0 mt-0.5 rounded-md bg-[rgba(210,200,126,0.12)] p-1.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          className="text-[var(--accent-yellow)]"
        >
          <path
            d="M7 1v8M4 6l3 3 3-3M2 11h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
          You&apos;re viewing demo data
        </p>
        <p className="text-xs text-[var(--text-subtle)] leading-relaxed mb-2.5">
          The web version uses simulated data for preview. Install the CLI tool
          to collect real data from your Creator Centers (Douyin, TikTok, Red
          Note) and get accurate persona analysis.
        </p>
        <Link
          href="/install"
          className="inline-block rounded px-3 py-1 text-xs font-medium bg-[var(--accent-yellow)] text-[var(--bg-primary)] hover:opacity-90 transition-opacity"
        >
          View installation guide →
        </Link>
      </div>
    </div>
  );
}
