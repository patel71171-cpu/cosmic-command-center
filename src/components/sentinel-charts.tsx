import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useSentinel } from '@/lib/sentinel-store';

const css = (name: string) => `var(--${name})`;
const colors = [
  css('critical'),
  css('high'),
  css('medium'),
  css('low'),
  css('muted-foreground'),
];
const tooltip = {
  contentStyle: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--foreground)',
  },
  itemStyle: { color: 'var(--foreground)' },
};

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Informational'] as const;

/** Score / risk / open-findings trend, one point per assessment. */
export function TrendChart({ mode = 'score' }: { mode?: 'score' | 'risk' | 'open' }) {
  const { assessments, findings } = useSentinel();
  const rows = assessments
    .map((a) => {
      const scoped = findings.filter((f) => (f as any).assessment_id === a.id);
      const open = (scoped.length ? scoped : findings).filter(
        (f) => f.status !== 'Verified',
      ).length;
      return {
        date: a.lastRun,
        score: Math.round(a.score),
        risk: Math.round(a.risk_score ?? 0),
        open,
      };
    })
    .reverse();
  const first = rows[0];
  const data = rows.length >= 2 ? rows : rows.length === 1 && first ? [first, first] : [];
  const stroke = css(mode === 'score' ? 'primary' : mode === 'risk' ? 'high' : 'critical');
  if (!data.length) {
    return (
      <div className="flex h-[230px] w-full items-center justify-center text-xs text-muted-foreground">
        No assessments yet — the trend appears once a scan completes.
      </div>
    );
  }
  const domain: number[] =
    mode === 'open' ? [0, Math.max(4, ...data.map((d) => d.open))] : [0, 100];
  return (
    <div
      className="h-[230px] w-full"
      role="img"
      aria-label={`${mode} trend across ${data.length} assessments`}
    >
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 5, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${mode}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.24} />
              <stop offset="100%" stopColor={css('primary')} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 5" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fill: css('muted-foreground'), fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={domain}
            tick={{ fill: css('muted-foreground'), fontSize: 10 }}
          />
          <Tooltip {...tooltip} />
          <Area
            dataKey={mode}
            type="monotone"
            stroke={stroke}
            strokeWidth={2.5}
            fill={`url(#fill-${mode})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeverityChart() {
  const { findings } = useSentinel();
  const data = SEVERITIES.map((name, i) => ({
    name,
    value: findings.filter((f) => f.severity === name).length,
    color: colors[i],
  }));
  const total = data.reduce((n, d) => n + d.value, 0);
  const summary = data.map((d) => `${d.name.toLowerCase()} ${d.value}`).join(', ');
  if (!total) {
    return (
      <div className="flex h-[230px] w-full items-center justify-center text-xs text-muted-foreground">
        No findings recorded yet.
      </div>
    );
  }
  return (
    <div className="flex min-h-[230px] flex-col items-center gap-4 sm:flex-row">
      <div
        className="relative h-[200px] w-full min-w-0 flex-none sm:min-w-[190px] sm:flex-1"
        role="img"
        aria-label={`Findings by severity: ${summary}`}
      >
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={66}
              outerRadius={86}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i]} />
              ))}
            </Pie>
            <Tooltip {...tooltip} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-2xl">{total}</strong>
          <span className="text-[10px] text-muted-foreground">TOTAL FINDINGS</span>
        </div>
      </div>
      <div className="w-full space-y-2 sm:w-[126px]">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-2 text-muted-foreground">
              <i className="h-2 w-2 rounded-sm" style={{ background: colors[i] }} />
              {d.name}
            </span>
            <span className="font-semibold">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryChart() {
  const { findings } = useSentinel();
  const tally = new Map<string, number>();
  findings.forEach((f) => {
    const key = f.category || 'General';
    tally.set(key, (tally.get(key) || 0) + 1);
  });
  const data = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
  if (!data.length) {
    return (
      <div className="flex h-[230px] w-full items-center justify-center text-xs text-muted-foreground">
        No findings recorded yet.
      </div>
    );
  }
  return (
    <div className="h-[230px] w-full" role="img" aria-label="Vulnerabilities by category">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 15, bottom: 0 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 5" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fill: css('muted-foreground'), fontSize: 10 }}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={95}
            tickLine={false}
            axisLine={false}
            tick={{ fill: css('muted-foreground'), fontSize: 10 }}
          />
          <Tooltip {...tooltip} />
          <Bar dataKey="count" fill={css('primary')} radius={[0, 3, 3, 0]} barSize={13} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
