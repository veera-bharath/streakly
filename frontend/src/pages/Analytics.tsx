import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { api } from '../api/client';
import { WeeklyData, MonthlyData, StreakData } from '../types';
import { useStore } from '../store/useStore';
import { ChartSkeleton, Skeleton } from '../components/Skeleton';
import { Habit } from '../types';

/* ─── Helpers ─── */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function mostConsistentDay(habits: Habit[]): string {
  if (!habits.length) return '—';
  const counts = Array(7).fill(0);
  habits.forEach(h => h.completions.forEach(d => counts[new Date(d + 'T00:00:00').getDay()]++));
  return DAY_NAMES[counts.indexOf(Math.max(...counts))];
}

function shortDate(d: string) {
  const [, m, day] = d.split('-');
  return `${parseInt(day)}/${parseInt(m)}`;
}

/* ─── Custom tooltip ─── */
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '8px 14px', boxShadow: 'var(--shadow)',
      fontSize: 13,
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

/* ─── Component ─── */
export function Analytics() {
  const { habits, fetchHabits } = useStore();
  const [weekly, setWeekly]   = useState<WeeklyData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHabits();
    Promise.all([api.analytics.weekly(), api.analytics.monthly(), api.analytics.streaks()])
      .then(([w, m, s]) => { setWeekly(w.data); setMonthly(m.data); setStreaks(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fetchHabits]);

  /* ── Insights computed from local habit data ── */
  const days30 = last30Days();
  const ratedHabits = habits.map(h => ({ ...h, rate: habitRate(h, days30) }));
  const best  = ratedHabits.reduce<typeof ratedHabits[0] | null>((a, b) => !a || b.rate > a.rate ? b : a, null);
  const worst = ratedHabits.reduce<typeof ratedHabits[0] | null>((a, b) => !a || b.rate < a.rate ? b : a, null);
  const consistDay = mostConsistentDay(habits);

  const weeklyAvg  = weekly.length  ? Math.round(weekly.reduce((s, d) => s + d.percentage, 0) / weekly.length) : 0;
  const monthlyAvg = monthly.length ? Math.round(monthly.reduce((s, d) => s + d.percentage, 0) / monthly.length) : 0;

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
          { label: '7-Day Avg', value: `${weeklyAvg}%`, color: 'var(--green)', icon: '📈' },
          { label: '30-Day Avg', value: `${monthlyAvg}%`, color: 'var(--blue)', icon: '📅' },
          { label: 'Habits tracked', value: `${habits.length}`, color: 'var(--amber)', icon: '📌' },
          { label: 'Top streak', value: streaks.length ? `${Math.max(...streaks.map(s => s.current))}d` : '—', color: 'var(--orange)', icon: '🔥' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="stat-card" style={{ padding: '18px 20px', gap: 10 }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.04em', color }}>{value}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>{label}</div>
          </div>
        ))}
      </div>

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
          <InsightCard
            icon="📆" label="Most Consistent Day"
            value={consistDay}
            sub="Based on all completions"
            color="#2563eb"
          />
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
              <YAxis domain={[0,100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 4 }} />
              <Bar dataKey="percentage" radius={[5,5,0,0]}>
                {weekly.map((d, i) => (
                  <Cell key={i} fill={d.percentage >= 80 ? 'var(--green)' : d.percentage >= 50 ? 'var(--amber)' : '#f87171'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Monthly line chart ── */}
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
              <YAxis domain={[0,100]} tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="percentage" stroke="var(--blue)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'var(--blue)', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Streak board ── */}
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
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  background: i === 0 ? 'var(--amber-bg)' : 'var(--surface-2)',
                  borderRadius: 'var(--radius)', borderLeft: `3px solid ${s.color}`,
                }}>
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{s.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {s.totalCompletions} total · best: {s.longest}d · 30d: {rate30}%
                    </div>
                  </div>
                  {i === 0 && <span style={{ fontSize: 14 }}>🏆</span>}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: s.current > 0 ? s.color : 'var(--text-3)', lineHeight: 1 }}>
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

      {!loading && streaks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)', fontSize: 14 }}>
          No habit data yet. Start completing habits to see analytics.
        </div>
      )}
    </div>
  );
}
