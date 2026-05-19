import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Flame, TrendingUp, Sprout } from 'lucide-react';
import { useHabits } from '../hooks/useHabits';
import { useStore } from '../store/useStore';
import { HabitCard } from '../components/HabitCard';
import { StatCardSkeleton, HabitCardSkeleton } from '../components/Skeleton';

/* ─── Helpers ─── */
function greeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}.`;
  if (h < 17) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

function subGreeting(pct: number, completed: number, total: number): string {
  if (total === 0) return 'Add your first habit to get started.';
  if (pct === 100) return `All ${total} habits completed today. `;
  if (pct >= 80) return `${completed} of ${total} habits done — ${total - completed} remaining.`;
  if (completed === 0) return `${total} habits scheduled for today.`;
  return `${completed} of ${total} habits completed today.`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

interface TrendProps { value: number; suffix?: string }
function Trend({ value, suffix = '' }: TrendProps) {
  if (value > 0) return <span className="trend-up">↑ +{value}{suffix}</span>;
  if (value < 0) return <span className="trend-down">↓ {value}{suffix}</span>;
  return <span className="trend-flat">— same</span>;
}

/* ─── Animated progress bar ─── */
function ProgressBar({ pct }: { pct: number }) {
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDisplayPct(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  const color = pct === 100
    ? 'linear-gradient(90deg, var(--green), #4ade80)'
    : pct >= 50
    ? 'linear-gradient(90deg, var(--amber), #fbbf24)'
    : 'linear-gradient(90deg, var(--red), #f87171)';
  const textColor = pct === 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="card" style={{ padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
        Today's progress
      </span>
      <div className="progress-track" style={{ flex: 1 }}>
        <div className="progress-fill" style={{ width: `${displayPct}%`, background: color }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 36, textAlign: 'right', color: textColor }}>
        {pct}%
      </span>
    </div>
  );
}

/* ─── Stat card data ─── */
function useStatCards(completed: number, yCompleted: number, pct: number, yPct: number, best: number) {
  return [
    {
      Icon: CheckCircle2, iconBg: 'var(--green-bg)', iconColor: 'var(--green)',
      value: completed, label: 'Completed today',
      trend: <Trend value={completed - yCompleted} />,
    },
    {
      Icon: Clock, iconBg: 'var(--amber-bg)', iconColor: 'var(--amber)',
      value: 0, label: 'Pending', // value computed below
      trend: <Trend value={-(completed - yCompleted)} />,
      _pending: true,
    },
    {
      Icon: Flame, iconBg: 'var(--orange-bg)', iconColor: 'var(--orange)',
      value: best, label: 'Top streak',
      trend: <span className="trend-flat">{best > 0 ? `${best}d best` : '—'}</span>,
    },
    {
      Icon: TrendingUp, iconBg: 'var(--purple-bg)', iconColor: 'var(--purple)',
      value: pct, label: 'Completion rate', suffix: '%',
      trend: <Trend value={pct - yPct} suffix="%" />,
    },
  ];
}

/* ─── Component ─── */
export function Dashboard() {
  const { habits, loading, completed, yCompleted, pct, yPct, topStreak: best, total } = useHabits();
  const { user, setOpenAddHabit } = useStore();

  const isLoading = loading && habits.length === 0;
  const statCards = useStatCards(completed, yCompleted, pct, yPct, best);

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 5, letterSpacing: '.04em', textTransform: 'uppercase' }}>
            {todayLabel()}
          </div>
          {isLoading ? (
            <div style={{ height: 36, width: 280, borderRadius: 8 }} className="skeleton" />
          ) : (
            <>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.15 }}>
                {greeting(user?.username ?? 'there')}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 5 }}>
                {subGreeting(pct, completed, total)}
              </p>
            </>
          )}
        </div>
        <button className="btn btn-primary hide-mobile" onClick={() => setOpenAddHabit(true)} style={{ flexShrink: 0 }}>
          + Add Habit
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {isLoading ? (
          [1,2,3,4].map(i => <StatCardSkeleton key={i} />)
        ) : total > 0 ? (
          statCards.map(({ Icon, iconBg, iconColor, value, label, trend, suffix, _pending }, i) => (
            <div key={label} className="stat-card anim-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="icon-wrap" style={{ background: iconBg }}>
                  <Icon size={18} color={iconColor} strokeWidth={2} />
                </div>
                {trend}
              </div>
              <div>
                <div className="value" style={{ color: iconColor }}>
                  {_pending ? total - completed : value}{suffix ?? ''}
                </div>
                <div className="label">{label}</div>
              </div>
            </div>
          ))
        ) : null}
      </div>

      {/* ── Progress bar ── */}
      {!isLoading && total > 0 && <ProgressBar pct={pct} />}

      {/* ── Habits list ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {isLoading
            ? <span className="skeleton" style={{ width: 80, height: 18, display: 'inline-block', borderRadius: 4 }} />
            : 'Your Habits'}
        </div>
        {!isLoading && total > 0 && (
          <span className="badge badge-neutral">{total} habit{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <HabitCardSkeleton key={i} />)}
        </div>
      ) : habits.length === 0 ? (
        <div className="empty-state anim-up">
          <div className="empty-state-icon"><Sprout size={48} color="var(--green)" strokeWidth={1.5} /></div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 8 }}>No habits yet</div>
          <div style={{ color: 'var(--text-2)', fontSize: 14, maxWidth: 260, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Add your first habit to start building consistency.
          </div>
          <button className="btn btn-primary" onClick={() => setOpenAddHabit(true)}>
            Add your first habit
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {habits.map((h, i) => (
            <HabitCard key={h.id} habit={h} animDelay={i * 60} />
          ))}
        </div>
      )}

    </div>
  );
}
