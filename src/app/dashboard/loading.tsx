export default function DashboardLoading() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)]"
      aria-busy="true"
      aria-label="Analyzing data"
    >
      <p className="analyzing-enter-0 mb-6 font-mono text-sm tracking-widest text-[var(--text-primary)]">
        Analyzing...
      </p>
      <div className="analyzing-enter-1 analyzing-shimmer-bar h-[3px] w-48 bg-[rgba(126,210,154,0.1)]" />
      <p className="analyzing-enter-2 mt-4 font-mono text-xs text-[var(--text-subtle)]">
        Processing signals
      </p>
    </div>
  );
}
