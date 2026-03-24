import Link from "next/link";

interface DashboardPageProps {
  searchParams: Promise<{ source?: string; persona?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const isDemo = params.source === "demo";
  const personaId = params.persona ?? "unknown";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--accent-green)" }}
            aria-label="Back to home"
          >
            &larr; DashPersona
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          {isDemo && (
            <span className="badge badge-green mt-1">Demo Mode</span>
          )}
        </div>
        <p
          className="text-sm"
          style={{ color: "var(--text-subtle)" }}
        >
          Persona: {personaId}
        </p>
      </header>

      {/* Growth Sparklines */}
      <section aria-labelledby="growth-heading">
        <h2 id="growth-heading" className="kicker mb-3">
          Growth Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["Followers", "Engagement", "Avg. Views", "Post Frequency"].map(
            (metric) => (
              <div key={metric} className="card p-5">
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {metric}
                </p>
                <p
                  className="metric-value mt-2 text-2xl font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {isDemo ? "--" : "--"}
                </p>
                <div
                  className="mt-3 h-8 w-full rounded"
                  style={{ background: "var(--bg-secondary)" }}
                  aria-label={`${metric} sparkline placeholder`}
                  role="img"
                />
              </div>
            ),
          )}
        </div>
      </section>

      {/* Persona Score */}
      <section aria-labelledby="persona-heading">
        <h2 id="persona-heading" className="kicker mb-3">
          Persona Score
        </h2>
        <div className="card p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            <div className="flex flex-col items-center gap-2">
              <p
                className="metric-value text-5xl font-bold"
                style={{ color: "var(--accent-green)" }}
              >
                {isDemo ? "72" : "--"}
              </p>
              <p
                className="text-xs font-medium"
                style={{ color: "var(--text-subtle)" }}
              >
                Overall Score
              </p>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Content Consistency",
                  score: isDemo ? "78" : "--",
                },
                {
                  label: "Audience Alignment",
                  score: isDemo ? "65" : "--",
                },
                {
                  label: "Brand Positioning",
                  score: isDemo ? "74" : "--",
                },
              ].map((item) => (
                <div key={item.label}>
                  <p
                    className="text-xs font-medium"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {item.label}
                  </p>
                  <p className="metric-value mt-1 text-xl font-semibold">
                    {item.score}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Platform Summary */}
      <section aria-labelledby="platforms-heading">
        <h2 id="platforms-heading" className="kicker mb-3">
          Cross-Platform Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { name: "Douyin", status: isDemo ? "Connected" : "Not connected" },
            { name: "TikTok", status: isDemo ? "Connected" : "Not connected" },
            {
              name: "Xiaohongshu",
              status: isDemo ? "Connected" : "Not connected",
            },
          ].map((platform) => (
            <div key={platform.name} className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{platform.name}</h3>
                <span
                  className={`badge ${isDemo ? "badge-green" : "badge-yellow"}`}
                >
                  {platform.status}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    Posts
                  </p>
                  <p className="metric-value text-lg font-semibold">
                    {isDemo ? "124" : "--"}
                  </p>
                </div>
                <div>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    Avg. Engagement
                  </p>
                  <p className="metric-value text-lg font-semibold">
                    {isDemo ? "3.2%" : "--"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
