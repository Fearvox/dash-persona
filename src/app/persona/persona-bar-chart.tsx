'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const GREEN = '#7ed29a';

interface PersonaBarChartProps {
  data: [string, number][];
}

interface ChartDatum {
  name: string;
  value: number;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        color: 'var(--text-primary)',
      }}
    >
      <p className="capitalize font-medium">{d.name}</p>
      <p className="mt-1" style={{ color: 'var(--text-subtle)' }}>
        {d.value.toFixed(1)}%
      </p>
    </div>
  );
}

export default function PersonaBarChart({ data }: PersonaBarChartProps) {
  const chartData: ChartDatum[] = data.map(([name, value]) => ({
    name,
    value,
  }));

  if (chartData.length === 0) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded text-xs"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-subtle)' }}
      >
        No content data
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 20, bottom: 4, left: 80 }}
        >
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
            tickFormatter={(v: number) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            width={75}
            axisLine={false}
            tickLine={false}
            style={{ textTransform: 'capitalize' }}
          />
          <Tooltip content={<ChartTooltip />} cursor={false} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {chartData.map((_, index) => (
              <Cell
                key={index}
                fill={GREEN}
                fillOpacity={0.7 - index * 0.04}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
