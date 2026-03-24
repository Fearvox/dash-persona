'use client';

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import {
  extractSparklineData,
  formatNumber,
  formatDelta,
  computeGrowthDelta,
  type SparklinePoint,
  type GrowthDelta,
} from '@/lib/engine';

const PLATFORM_LABELS: Record<string, string> = {
  douyin: 'Douyin',
  tiktok: 'TikTok',
  xhs: 'Xiaohongshu',
};

interface GrowthSparklinesProps {
  profiles: Record<string, CreatorProfile>;
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--accent-green)' }}
      >
        &#8593; {formatDelta(delta)}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--accent-red)' }}
      >
        &#8595; {formatDelta(delta)}
      </span>
    );
  }
  return (
    <span
      className="text-xs font-medium"
      style={{ color: 'var(--text-subtle)' }}
    >
      &#8594; 0
    </span>
  );
}

function SparklineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SparklinePoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        color: 'var(--text-primary)',
      }}
    >
      <p style={{ color: 'var(--text-subtle)' }}>{point.time}</p>
      <p className="mt-1 font-medium">
        Followers: {formatNumber(point.followers)}
      </p>
      {point.views > 0 && (
        <p className="font-medium">Views: {formatNumber(point.views)}</p>
      )}
    </div>
  );
}

export default function GrowthSparklines({ profiles }: GrowthSparklinesProps) {
  const platforms = Object.entries(profiles);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {platforms.map(([key, profile]) => {
        const sparkData = extractSparklineData(profile, 168); // 7 days
        const growthDelta: GrowthDelta | null = computeGrowthDelta(profile);
        const followerDelta = growthDelta?.followers.delta ?? 0;
        const label = PLATFORM_LABELS[key] ?? key;

        return (
          <div key={key} className="card p-5">
            <div className="flex items-center justify-between">
              <p
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-subtle)' }}
              >
                {label}
              </p>
              <DeltaIndicator delta={followerDelta} />
            </div>

            <p
              className="metric-value mt-2 text-2xl font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {formatNumber(profile.profile.followers)}
            </p>
            <p
              className="mt-0.5 text-xs"
              style={{ color: 'var(--text-subtle)' }}
            >
              followers
            </p>

            <div className="mt-3 h-12 w-full">
              {sparkData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sparkData}
                    margin={{ top: 2, right: 2, bottom: 0, left: 2 }}
                  >
                    <defs>
                      <linearGradient
                        id={`grad-${key}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--accent-green)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--accent-green)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={<SparklineTooltip />}
                      cursor={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="followers"
                      stroke="var(--accent-green)"
                      strokeWidth={1.5}
                      fill={`url(#grad-${key})`}
                      dot={false}
                      activeDot={{
                        r: 3,
                        fill: 'var(--accent-green)',
                        stroke: 'var(--bg-card)',
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  className="flex h-full items-center justify-center rounded text-xs"
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-subtle)',
                  }}
                >
                  Insufficient data
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
