import Link from "next/link";

const features = [
  {
    title: "Cross-Platform Analysis",
    description:
      "Unified metrics across Douyin, TikTok, and Red Note. Compare performance with normalized, platform-agnostic scoring.",
    icon: (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 9l3 2 4-4 3 3" />
      </svg>
    ),
  },
  {
    title: "Persona Scoring",
    description:
      "Deterministic algorithms evaluate content consistency, audience alignment, and brand positioning without any AI black boxes.",
    icon: (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    title: "Growth Tracking",
    description:
      "Historical snapshots with delta calculations. Sparkline visualizations show trends at a glance across all connected platforms.",
    icon: (
      <svg
        aria-hidden="true"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section
        className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center sm:py-32"
        aria-labelledby="hero-heading"
      >
        <p className="kicker mb-4">Creator Intelligence Engine</p>

        <h1
          id="hero-heading"
          className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          style={{ color: "var(--text-primary)" }}
        >
          DashPersona
        </h1>

        <p
          className="mt-2 text-lg font-medium sm:text-xl"
          style={{ color: "var(--accent-green)" }}
        >
          Data-Agnostic Creator Intelligence Engine
        </p>

        <p
          className="mt-6 max-w-xl text-base leading-7 sm:text-lg"
          style={{ color: "var(--text-secondary)" }}
        >
          Analyze your social media presence across Douyin, TikTok, and
          Red Note with deterministic, AI-free algorithms.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard?source=demo&persona=tutorial"
            className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold transition-colors"
            style={{
              background: "var(--accent-green)",
              color: "var(--bg-primary)",
            }}
          >
            Try Demo
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex h-12 items-center justify-center rounded-full border px-8 text-sm font-semibold transition-colors hover:bg-white/5"
            style={{
              borderColor: "var(--border-medium)",
              color: "var(--text-primary)",
            }}
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section
        className="mx-auto w-full max-w-5xl px-6 pb-24"
        aria-labelledby="features-heading"
      >
        <h2 id="features-heading" className="sr-only">
          Key Features
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="card flex flex-col gap-4 p-6 transition-colors"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{
                  background: "rgba(126, 210, 154, 0.1)",
                  color: "var(--accent-green)",
                }}
              >
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p
                className="text-sm leading-6"
                style={{ color: "var(--text-secondary)" }}
              >
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
