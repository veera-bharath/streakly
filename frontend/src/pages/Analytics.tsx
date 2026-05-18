import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';
import { ChartSkeleton, Skeleton } from '../components/Skeleton';
import { Habit } from '../types';

/* ─── Helpers ─── */
function last30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });
}

function habitRate(h: Habit, days: string[]): number {
  const n = days.filter(d => h.completions.includes(d)).length;
  return days.length > 0 ? Math.round((n / days.length) * 100) : 0;
}

function shortDate(d: string) {
  const [, m, day] = d.split('-');
  return `${parseInt(day)}/${parseInt(m)}`;
}

/* ─── Tooltips ─── */
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '8px 14px', boxShadow: 'var(--shadow)', fontSize: 13,
    }}>
      <div style={{ color: 'var(--text-2)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{payload[0].value}%</div>
    </div>
  );
};

/* ─── Insight Card ─── */
function InsightCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="insight-card" style={{ background: `${color}10`, borderColor: `${color}25` }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--text)', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─── Smart Insights ─── */
function SmartInsightsBanner({ insights }: { insights: string[] }) {
  if (!insights.length) return null;
  return (
    <div className="card" style={{ padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>💡</span>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Smart Insights</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((insight, i) => (
          <div
            key={i}
            className="anim-up"
            style={{
              animationDelay: `${i * 80}ms`,
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '9px 12px',
              background: 'var(--surface-2)', borderRadius: 'var(--radius)',
              fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
            }}
          >
            <span style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }}>›</span>
            {insight}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty state ─── */
function EmptyAnalytics() {
  return (
    <div className="empty-state anim-up">
      <div className="empty-state-icon">📊</div>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 8 }}>No data yet</div>
      <div style={{ color: 'var(--text-2)', fontSize: 14, maxWidth: 280, margin: '0 auto', lineHeight: 1.6 }}>
        Start completing habits to unlock analytics and insights.
      </div>
    </div>
  );
}

/* ─── Component ─── */
export function Analytics() {
  const { weekly, monthly, streaks, overview, trends, habits, loading, error } = useAnalytics();

  const days30 = useMemo(() => last30Days(), []);
  const ratedHabits = useMemo(() =>
    habits.map(h => ({ ...h, rate: habitRate(h, days30) })),
    [habits, days30]
  );

  const best  = ratedHabits.reduce<typeof ratedHabits[0] | null>((a, b) => !a || b.rate > a.rate ? b : a, null);
  const worst = ratedHabits.reduce<typeof ratedHabits[0] | null>((a, b) => !a || b.rate < a.rate ? b : a, null);

  const weeklyAvg  = weekly.length  ? Math.round(weekly.reduce((s, d)  => s + d.percentage, 0) / weekly.length)  : 0;
  const monthlyAvg = monthly.length ? Math.round(monthly.reduce((s, d) => s + d.percentage, 0) / monthly.length) : 0;

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--red)', fontSize: 14 }}>
        Failed to load analytics: {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="section-title">Analytics</h1>
        <p className="section-sub">Your consistency at a glance</p>
      </div>

      {/* ── Summary stat row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {loading ? [1,2,3,4].map(i => (
          <div key={i} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton width={40} height={40} borderRadius={10} />
            <Skeleton width={60} height={28} />
            <Skeleton width={80} height={11} />
          </div>
        )) : [
          { label: '7-Day Avg',     value: `${overview?.completionRate7d  ?? weeklyAvg}%`,                 color: 'var(--green)',  icon: '📈' },
          { label: '30-Day Avg',    value: `${overview?.completionRate30d ?? monthlyAvg}%`,                color: 'var(--blue)',   icon: '📅' },
          { label: 'Consistency',   value: overview ? `${overview.consistencyScore}%` : '—',              color: 'var(--purple)', icon: '🎯' },
          { label: 'Active Streaks',value: overview ? `${overview.activeStreaks}/${overview.totalHabits}` : '—', color: 'var(--orange)', icon: '🔥' },
        ].map(({ label, value, color, icon }, i) => (
          <div key={label} className="stat-card anim-up" style={{ padding: '18px 20px', gap: 10, animationDelay: `${i * 60}ms` }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.04em', color }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>{label}</div>
          </div>
        ))}
      </div>

      {!loading && overview && <SmartInsightsBanner insights={overview.insights} />}

      {/* ── Insight cards ── */}
      {habits.length > 0 && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {best && (
            <InsightCard
              icon="🏆" label="Best Performing (30d)"
              value={`${best.icon} ${best.name}`}
              sub={`${best.rate}% completion rate`}
              color="#16a34a"
            />
          )}
          {worst && best?.id !== worst.id && (
            <InsightCard
              icon="📉" label="Needs Attention (30d)"
              value={`${worst.icon} ${worst.name}`}
              sub={`${worst.rate}% completion rate`}
              color="#dc2626"
            />
          )}
          {overview && (
            <InsightCard
              icon="📆" label="Most Consistent Day"
              value={overview.bestDayOfWeek}
              sub={`Weakest: ${overview.worstDayOfWeek}`}
              color="#2563eb"
            />
          )}
        </div>
      )}

      {/* ── By Day of Week ── */}
      {!loading && trends && trends.byDayOfWeek.length > 0 && (
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>By Day of Week</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Average completion rate per weekday (90 days)</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trends.byDayOfWeek} barSize={32} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 4 }} />
              <Bar dataKey="avg" radius={[5, 5, 0, 0]}>
                {trends.byDayOfWeek.map((d, i) => (
                  <Cell key={i} fill={d.avg >= 70 ? 'var(--green)' : d.avg >= 40 ? 'var(--amber)' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Weekly bar chart ── */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Weekly Completion</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Last 7 days — daily habit completion %</div>
          </div>
          <span className="badge badge-green">{weeklyAvg}% avg</span>
        </div>
        {loading ? <ChartSkeleton height={200} /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly.map(d => ({ ...d, day: shortDate(d.date) }))} barSize={36} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11, fontFamily: 'Plus Jakarta Sans' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 4 }} />
              <Bar dataKey="percentage" radius={[5, 5, 0, 0]}>
                {weekly.map((d, i) => (
                  <Cell key={i} fill={d.percentage >= 80 ? 'var(--green)' : d.percentage >= 50 ? 'var(--amber)' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 30-Day Trend ── */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>30-Day Trend</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Completion rate over the past month</div>
          </div>
          <span className="badge badge-blue">{monthlyAvg}% avg</span>
        </div>
        {loading ? <ChartSkeleton height={180} /> : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly.map((d, i) => ({ ...d, day: i % 5 === 0 ? shortDate(d.date) : '' }))}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--blue)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="percentage" stroke="var(--blue)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'var(--blue)', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Streak Board ── */}
      {!loading && streaks.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Streak Board</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Ranked by current streak</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...streaks].sort((a, b) => b.current - a.current).map((s, i) => {
              const rate30 = ratedHabits.find(h => h.id === s.id)?.rate ?? 0;
              return (
                <div
                  key={s.id}
                  className="anim-up"
                  style={{
                    animationDelay: `${i * 50}ms`,
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                    background: i === 0 ? 'var(--amber-bg)' : 'var(--surface-2)',
                    borderRadius: 'var(--radius)', borderLeft: `3px solid ${s.color}`,
                    transition: 'transform .15s, box-shadow .15s',
                  }}
                >
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{s.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {s.totalCompletions} total · best: {s.longest}d · 30d: {rate30}%
                    </div>
                  </div>
                  {i === 0 && <span style={{ fontSize: 14 }}>🏆</span>}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, lineHeight: 1, color: s.current > 0 ? s.color : 'var(--text-3)' }}>
                      {s.current}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>days</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && streaks.length === 0 && <EmptyAnalytics />}
    </div>
  );
}
