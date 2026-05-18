import { useState, useEffect, useRef, memo } from 'react';
import { Habit } from '../types';
import { useStore } from '../store/useStore';
import { MiniHeatmap } from './MiniHeatmap';

interface Props {
  habit: Habit;
  animDelay?: number;
}

/* ─── Undo toast ─── */
function UndoToast({ onUndo, onDismiss }: { onUndo: () => void; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const DURATION = 5000;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) { clearInterval(intervalRef.current!); onDismiss(); }
    }, 50);
    return () => clearInterval(intervalRef.current!);
  }, [onDismiss]);

  return (
    <div
      className="anim-in"
      style={{
        margin: '10px 20px 0', padding: '10px 14px',
        background: 'var(--green-bg)', borderRadius: 'var(--radius)',
        border: '1px solid var(--green)', position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, background: 'var(--green)', width: `${progress}%`, transition: 'width 50ms linear', opacity: 0.6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, flex: 1 }}>Marked complete</span>
        <button className="btn btn-sm btn-ghost" onClick={onUndo} style={{ color: 'var(--green)', borderColor: 'var(--green)', padding: '3px 10px' }}>
          Undo
        </button>
      </div>
    </div>
  );
}

/* ─── HabitCard (memoized) ─── */
export const HabitCard = memo(function HabitCard({ habit, animDelay = 0 }: Props) {
  const { toggleHabit, deleteHabit } = useStore();
  const [toggling, setToggling]       = useState(false);
  const [toggleError, setToggleError] = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const prevCompletedToday = useRef(habit.completedToday);

  const done      = habit.completedToday;
  const isWeekly  = habit.frequencyType === 'weekly';
  const weekProgress = habit.completedThisWeek;
  const weekTarget   = habit.frequencyTarget;
  const weeklyDone   = weekProgress >= weekTarget;

  // Show undo toast when habit goes incomplete → complete
  useEffect(() => {
    if (!prevCompletedToday.current && habit.completedToday) setShowUndoToast(true);
    prevCompletedToday.current = habit.completedToday;
  }, [habit.completedToday]);

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    if (showUndoToast) setShowUndoToast(false);
    try {
      await toggleHabit(habit.id);
    } catch {
      // Optimistic update already rolled back in store; show brief error flash
      setToggleError(true);
      setTimeout(() => setToggleError(false), 1800);
    } finally {
      setToggling(false);
    }
  };

  const handleUndo = async () => {
    setShowUndoToast(false);
    setToggling(true);
    try { await toggleHabit(habit.id); } catch { /* ignore */ } finally { setToggling(false); }
  };

  const completionRate = (() => {
    if (!habit.completions.length) return 0;
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
    return Math.round(last30.filter(d => habit.completions.includes(d)).length / 30 * 100);
  })();

  const streakLabel = habit.streakUnit === 'weeks' ? 'wks' : habit.streak === 1 ? 'day' : 'days';

  return (
    <div
      className="card card-hover anim-up"
      style={{
        animationDelay: `${animDelay}ms`,
        padding: 0,
        borderLeft: `4px solid ${habit.color}`,
        overflow: 'hidden',
        outline: toggleError ? `2px solid var(--red)` : 'none',
        transition: 'outline 0.2s ease',
      }}
    >
      {/* Card header */}
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

          {/* Circle toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            title={done ? 'Mark incomplete' : 'Mark complete'}
            className="habit-toggle"
            style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              border: `2px solid ${done ? habit.color : toggleError ? 'var(--red)' : 'var(--border-2)'}`,
              background: done ? habit.color : toggleError ? 'var(--red-bg)' : 'transparent',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
              cursor: toggling ? 'wait' : 'pointer',
              animation: done && !toggling ? 'checkPop .35s ease' : 'none',
              boxShadow: done ? `0 2px 8px ${habit.color}55` : 'none',
              transition: 'border-color .2s, background .2s, box-shadow .2s, transform .15s',
            }}
          >
            {toggling
              ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', display: 'block', animation: 'spin .6s linear infinite' }} />
              : done ? '✓' : ''}
          </button>

          {/* Name + description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 15, fontWeight: 700, letterSpacing: '-.01em',
                textDecoration: done ? 'none' : 'none',
                opacity: done ? 0.85 : 1,
                transition: 'opacity .2s',
              }}>
                {habit.icon} {habit.name}
              </span>
              {isWeekly ? (
                <span
                  className="badge"
                  style={{
                    background: weeklyDone ? 'var(--green-bg)' : 'var(--surface-2)',
                    color: weeklyDone ? 'var(--green)' : 'var(--text-3)',
                    border: `1px solid ${weeklyDone ? 'var(--green)' : 'var(--border)'}`,
                    transition: 'all .2s',
                  }}
                >
                  {weeklyDone ? '✓ ' : ''}{weekProgress}/{weekTarget}×wk
                </span>
              ) : (
                done && <span className="badge badge-green anim-in">✓ Done</span>
              )}
            </div>
            {habit.description && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {habit.description}
              </div>
            )}
          </div>

          {/* Streak + menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, lineHeight: 1, color: habit.streak > 0 ? habit.color : 'var(--text-3)' }}>
                {habit.streak > 0 && <span style={{ fontSize: 14 }}>🔥</span>} {habit.streak}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
                {streakLabel}
              </div>
            </div>

            <button
              className="btn-icon"
              onClick={() => setShowDelete(s => !s)}
              style={{ color: showDelete ? 'var(--red)' : 'var(--text-3)', background: showDelete ? 'var(--red-bg)' : 'transparent' }}
            >
              ···
            </button>
          </div>
        </div>
      </div>

      {/* Error flash */}
      {toggleError && (
        <div className="anim-in" style={{ margin: '10px 20px 0', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 'var(--radius)', border: '1px solid #fca5a5', fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
          Failed to update — please try again.
        </div>
      )}

      {/* Undo toast */}
      {showUndoToast && <UndoToast onUndo={handleUndo} onDismiss={() => setShowUndoToast(false)} />}

      {/* Delete confirm */}
      {showDelete && (
        <div className="anim-in" style={{
          margin: '12px 20px 0', padding: '11px 14px',
          background: 'var(--red-bg)', borderRadius: 'var(--radius)',
          border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500, flex: 1 }}>Delete habit and all its data?</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button>
          <button className="btn btn-sm btn-danger" onClick={() => deleteHabit(habit.id)}>Delete</button>
        </div>
      )}

      {/* Heatmap */}
      <div style={{ padding: '16px 20px 0', overflowX: 'auto' }}>
        <MiniHeatmap completions={habit.completions} color={habit.color} weeks={16} />
      </div>

      {/* Footer stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '12px 20px 16px', borderTop: '1px solid var(--border)', marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 16, flex: 1 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Best streak</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {habit.longestStreak}{habit.streakUnit === 'weeks' ? 'w' : 'd'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{habit.completions.length}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>30d rate</span>
            <span style={{
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
              color: completionRate >= 70 ? 'var(--green)' : completionRate >= 40 ? 'var(--amber)' : 'var(--red)',
            }}>
              {completionRate}%
            </span>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`btn btn-sm ${done ? 'btn-ghost' : 'btn-secondary'}`}
          style={{ flexShrink: 0 }}
        >
          {done ? 'Undo' : '+ Complete Today'}
        </button>
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparator — only re-render when habit data actually changed
  return (
    prev.habit.id               === next.habit.id &&
    prev.habit.completedToday   === next.habit.completedToday &&
    prev.habit.completedThisWeek === next.habit.completedThisWeek &&
    prev.habit.streak           === next.habit.streak &&
    prev.habit.completions.length === next.habit.completions.length &&
    prev.animDelay              === next.animDelay
  );
});
