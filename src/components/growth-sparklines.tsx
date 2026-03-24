'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  YAxis,
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
  xhs: 'Red Note',
};

const GREEN = '#7ed29a';
const RED = '#c87e7e';

interface GrowthSparklinesProps {
  profiles: Record<string, CreatorProfile>;
}

function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="text-xs font-medium" style={{ color: GREEN }}>
        &#8593; {formatDelta(delta)}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="text-xs font-medium" style={{ color: RED }}>
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
    </div>
  );
}

/**
 * Build SVG gradient stops that blend green↔red based on whether each
 * segment is rising or falling. The gradient runs horizontally (x1→x2)
 * so each data point maps to a percentage along the X axis.
 */
function buildDirectionStops(data: SparklinePoint[]): React.ReactNode[] {
  if (data.length < 2) return [<stop key="0" offset="0%" stopColor={GREEN} />];

  const stops: React.ReactNode[] = [];
  for (let i = 0; i < data.length; i++) {
    const pct = `${((i / (data.length - 1)) * 100).toFixed(1)}%`;

    // Determine local direction: compare to previous point
    let rising: boolean;
    if (i === 0) {
      rising = data[1].followers >= data[0].followers;
    } else {
      rising = data[i].followers >= data[i - 1].followers;
    }

    const color = rising ? GREEN : RED;

    // Add a tiny offset pair at each transition to create smooth blending
    if (i > 0) {
      const prevRising = data[i].followers >= data[i - 1].followers;
      const prevPrevRising =
        i > 1 ? data[i - 1].followers >= data[i - 2].followers : prevRising;
      if (prevRising !== prevPrevRising) {
        // Direction changed — add a blending zone
        const blendPct = `${(((i - 0.5) / (data.length - 1)) * 100).toFixed(1)}%`;
        stops.push(
          <stop
            key={`blend-${i}`}
            offset={blendPct}
            stopColor={rising ? GREEN : RED}
            stopOpacity={0.6}
          />,
        );
      }
    }

    stops.push(<stop key={`pt-${i}`} offset={pct} stopColor={color} />);
  }

  return stops;
}

export default function GrowthSparklines({ profiles }: GrowthSparklinesProps) {
  const platforms = Object.entries(profiles);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {platforms.map(([key, profile]) => (
        <SparklineCard key={key} platformKey={key} profile={profile} />
      ))}
    </div>
  );
}

function SparklineCard({
  platformKey,
  profile,
}: {
  platformKey: string;
  profile: CreatorProfile;
}) {
  const sparkData = useMemo(
    () => extractSparklineData(profile, 168),
    [profile],
  );
  const growthDelta: GrowthDelta | null = useMemo(
    () => computeGrowthDelta(profile),
    [profile],
  );
  const followerDelta = growthDelta?.followers.delta ?? 0;
  const pctChange = growthDelta?.followers.pct ?? 0;
  const label = PLATFORM_LABELS[platformKey] ?? platformKey;
  const overallColor = followerDelta >= 0 ? GREEN : RED;

  // Build directional gradient stops
  const strokeStops = useMemo(
    () => buildDirectionStops(sparkData),
    [sparkData],
  );
  const fillStops = useMemo(() => {
    // Same color pattern but with vertical fade for fill
    return buildDirectionStops(sparkData);
  }, [sparkData]);

  const strokeGradId = `stroke-${platformKey}`;
  const fillGradId = `fill-${platformKey}`;

  return (
    <div className="card p-5">
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
      <div className="mt-0.5 flex items-center gap-2">
        <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
          followers
        </p>
        {pctChange !== 0 && (
          <span
            className="text-xs font-medium"
            style={{ color: overallColor }}
          >
            {pctChange > 0 ? '+' : ''}
            {pctChange.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-3 h-16 w-full">
        {sparkData.length >= 2 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={sparkData}
              margin={{ top: 4, right: 2, bottom: 0, left: 2 }}
            >
              <defs>
                {/* Horizontal stroke gradient: green↔red by direction */}
                <linearGradient
                  id={strokeGradId}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  {strokeStops}
                </linearGradient>

                {/* Fill: same horizontal color blend + vertical fade to transparent */}
                <linearGradient
                  id={`${fillGradId}-h`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  {fillStops}
                </linearGradient>
                <linearGradient
                  id={fillGradId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={overallColor}
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor={overallColor}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Tooltip content={<SparklineTooltip />} cursor={false} />
              <Area
                type="monotone"
                dataKey="followers"
                stroke={`url(#${strokeGradId})`}
                strokeWidth={2}
                fill={`url(#${fillGradId})`}
                dot={false}
                activeDot={{
                  r: 3,
                  fill: overallColor,
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
}
