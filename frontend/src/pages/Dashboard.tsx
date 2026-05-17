import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { HabitCard } from '../components/HabitCard';
import { AddHabitModal } from '../components/AddHabitModal';
import { StatCardSkeleton, HabitCardSkeleton } from '../components/Skeleton';
import { Habit } from '../types';

/* ─── Helpers ─── */
function todayStr()     { return new Date().toISOString().split('T')[0]; }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; }

function greeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}.`;
  if (h < 17) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

function subGreeting(pct: number, completed: number, total: number): string {
  if (total === 0) return 'Add your first habit to get started.';
  if (pct === 100) return `All ${total} habits completed today.`;
  if (pct >= 80)   return `${completed} of ${total} habits done — ${total - completed} remaining.`;
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

function computeTrends(habits: Habit[]) {
  const today     = todayStr();
  const yesterday = yesterdayStr();
  const completed  = habits.filter(h => h.completions.includes(today)).length;
  const yCompleted = habits.filter(h => h.completions.includes(yesterday)).length;
  const best = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
  const total = habits.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const yPct = total > 0 ? Math.round((yCompleted / total) * 100) : 0;
  return { completed, yCompleted, best, total, pct, yPct };
}

/* ─── Component ─── */
export function Dashboard() {
  const { habits, fetchHabits, loading, user } = useStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const { completed, yCompleted, best, total, pct, yPct } = computeTrends(habits);
  const isLoading = loading && habits.length === 0;

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
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ flexShrink: 0 }}>
          + Add Habit
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {isLoading ? (
          [1,2,3,4].map(i => <StatCardSkeleton key={i} />)
        ) : total > 0 ? (<>
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="icon-wrap" style={{ background: 'var(--green-bg)' }}>✅</div>
              <Trend value={completed - yCompleted} />
            </div>
            <div>
              <div className="value" style={{ color: 'var(--green)' }}>{completed}</div>
              <div className="label">Completed today</div>
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="icon-wrap" style={{ background: 'var(--amber-bg)' }}>⏳</div>
              <Trend value={-(completed - yCompleted)} />
            </div>
            <div>
              <div className="value" style={{ color: 'var(--amber)' }}>{total - completed}</div>
              <div className="label">Pending</div>
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="icon-wrap" style={{ background: 'var(--orange-bg)' }}>🔥</div>
              <span className="trend-flat">{best > 0 ? `${best}d best` : '—'}</span>
            </div>
            <div>
              <div className="value" style={{ color: 'var(--orange)' }}>{best}</div>
              <div className="label">Top streak</div>
            </div>
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="icon-wrap" style={{ background: 'var(--purple-bg)' }}>📊</div>
              <Trend value={pct - yPct} suffix="%" />
            </div>
            <div>
              <div className="value" style={{ color: 'var(--purple)' }}>{pct}%</div>
              <div className="label">Completion rate</div>
            </div>
          </div>
        </>) : null}
      </div>

      {/* ── Progress bar ── */}
      {!isLoading && total > 0 && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap', minWidth: 100 }}>
            Today's progress
          </span>
          <div className="progress-track" style={{ flex: 1 }}>
            <div
              className="progress-fill"
              style={{
                width: `${pct}%`,
                background: pct === 100
                  ? 'linear-gradient(90deg, var(--green), #4ade80)'
                  : pct >= 50
                  ? 'linear-gradient(90deg, var(--amber), #fbbf24)'
                  : 'linear-gradient(90deg, var(--red), #f87171)',
              }}
            />
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 36, textAlign: 'right',
            color: pct === 100 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)',
          }}>
            {pct}%
          </span>
        </div>
      )}

      {/* ── Habits list ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {isLoading ? <span className="skeleton" style={{ width: 80, height: 18, display: 'inline-block', borderRadius: 4 }} /> : 'Your Habits'}
        </div>
        {!isLoading && total > 0 && <span className="badge badge-neutral">{total} habit{total !== 1 ? 's' : ''}</span>}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <HabitCardSkeleton key={i} />)}
        </div>
      ) : habits.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          border: '1.5px dashed var(--border-2)', borderRadius: 'var(--radius-xl)',
          background: 'transparent',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 8 }}>No habits yet</div>
          <div style={{ color: 'var(--text-2)', fontSize: 14, maxWidth: 260, margin: '0 auto 24px', lineHeight: 1.6 }}>
            Add your first habit to start tracking.
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Add your first habit
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {habits.map((h, i) => <HabitCard key={h.id} habit={h} animDelay={i * 60} />)}
        </div>
      )}

      {showModal && <AddHabitModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
