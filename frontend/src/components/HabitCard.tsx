import { useState, useEffect, useRef, memo } from 'react';
import { Flame, MoreHorizontal, Check, AlertCircle, Pencil, Trash2, Shield, ShieldAlert } from 'lucide-react';
import { Habit } from '../types';
import { useStore } from '../store/useStore';
import { api } from '../api/client';
import { MiniHeatmap } from './MiniHeatmap';
import { AddHabitModal } from './AddHabitModal';

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
        <Check size={14} color="var(--green)" strokeWidth={2.5} />
        <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, flex: 1 }}>Marked complete</span>
        <button className="btn btn-sm btn-ghost" onClick={onUndo} style={{ color: 'var(--green)', borderColor: 'var(--green)', padding: '3px 10px' }}>
          Undo
        </button>
      </div>
    </div>
  );
}

/* ─── Note row ─── */
function NoteRow({ habitId, date, initialNote }: { habitId: string; date: string; initialNote: string | null }) {
  const { updateHabit } = useStore();
  const [value, setValue] = useState(initialNote ?? '');
  const [editing, setEditing] = useState(initialNote === null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setValue(initialNote ?? '');
  }, [initialNote, editing]);

  const save = async () => {
    const note = value.trim() || null;
    try {
      const updated = await api.habits.updateNote(habitId, date, note);
      updateHabit(updated);
    } catch { /* ignore — server reconciles on next toggle */ }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { setValue(initialNote ?? ''); setEditing(false); }
  };

  return (
    <div className="anim-in" style={{ margin: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value.slice(0, 200))}
          onBlur={save}
          onKeyDown={handleKeyDown}
          placeholder="Add a note…"
          maxLength={200}
          style={{
            flex: 1, fontSize: 13, color: 'var(--text-2)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 10px', outline: 'none',
            fontFamily: 'inherit',
          }}
        />
      ) : (
        <>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', fontStyle: initialNote ? 'normal' : 'italic' }}>
            {initialNote || 'Add a note…'}
          </span>
          <button
            className="btn-icon"
            onClick={() => setEditing(true)}
            title="Edit note"
            style={{ color: 'var(--text-3)', opacity: 0.6 }}
          >
            <Pencil size={13} />
          </button>
        </>
      )}
    </div>
  );
}

/* ─── HabitCard (memoized) ─── */
export const HabitCard = memo(function HabitCard({ habit, animDelay = 0 }: Props) {
  const { toggleHabit, deleteHabit, useFreeze } = useStore();
  const [toggling, setToggling]           = useState(false);
  const [freezing, setFreezing]           = useState(false);
  const [freezeError, setFreezeError]     = useState(false);
  const [toggleError, setToggleError]     = useState(false);
  const [showMenu, setShowMenu]           = useState(false);
  const [showDelete, setShowDelete]       = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const prevCompletedToday = useRef(habit.completedToday);

  const done        = habit.completedToday;
  const isWeekly    = habit.frequencyType === 'weekly';
  const weekProgress = habit.completedThisWeek;
  const weekTarget   = habit.frequencyTarget;
  const weeklyDone   = weekProgress >= weekTarget;

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

  const handleMenuToggle = () => {
    setShowMenu(s => !s);
    setShowDelete(false);
  };

  const handleUseFreeze = async () => {
    if (freezing) return;
    setFreezing(true);
    try {
      await useFreeze(habit.id);
    } catch {
      setFreezeError(true);
      setTimeout(() => setFreezeError(false), 2000);
    } finally {
      setFreezing(false);
    }
  };

  const completionDates = new Set(habit.completions.map(c => c.date));
  const completionRate = (() => {
    if (!habit.completions.length) return 0;
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
    return Math.round(last30.filter(d => completionDates.has(d)).length / 30 * 100);
  })();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayNote = habit.completions.find(c => c.date === todayStr)?.notes ?? null;

  const streakLabel = habit.streakUnit === 'weeks' ? 'wks' : habit.streak === 1 ? 'day' : 'days';

  return (
    <>
      {showEdit && (
        <AddHabitModal habit={habit} onClose={() => setShowEdit(false)} />
      )}

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
                cursor: toggling ? 'wait' : 'pointer',
                animation: done && !toggling ? 'checkPop .35s ease' : 'none',
                boxShadow: done ? `0 2px 8px ${habit.color}55` : 'none',
                transition: 'border-color .2s, background .2s, box-shadow .2s, transform .15s',
              }}
            >
              {toggling
                ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', display: 'block', animation: 'spin .6s linear infinite' }} />
                : done
                  ? <Check size={15} strokeWidth={3} />
                  : null
              }
            </button>

            {/* Name + description */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', opacity: done ? 0.85 : 1, transition: 'opacity .2s' }}>
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
                    {weeklyDone && <Check size={10} strokeWidth={3} style={{ marginRight: 2 }} />}
                    {weekProgress}/{weekTarget}×wk
                  </span>
                ) : (
                  done && (
                    <span className="badge badge-green anim-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Check size={10} strokeWidth={3} /> Done
                    </span>
                  )
                )}
              </div>
              {habit.description && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {habit.description}
                </div>
              )}
            </div>

            {/* Streak + freeze shield + menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, lineHeight: 1, color: habit.streak > 0 ? habit.color : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  {habit.streak > 0 && <Flame size={16} color="var(--orange)" strokeWidth={2} />}
                  {habit.streak}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '.04em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                  {habit.freezesLeft > 0 && <Shield size={9} strokeWidth={2.5} color="var(--blue, #3b82f6)" />}
                  {streakLabel}
                </div>
              </div>

              <button
                className="btn-icon"
                onClick={handleMenuToggle}
                style={{ color: showMenu ? 'var(--text-1)' : 'var(--text-3)', background: showMenu ? 'var(--surface-2)' : 'transparent' }}
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Error flash */}
        {toggleError && (
          <div className="anim-in" style={{ margin: '10px 20px 0', padding: '8px 12px', background: 'var(--red-bg)', borderRadius: 'var(--radius)', border: '1px solid #fca5a5', fontSize: 13, color: 'var(--red)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} />
            Failed to update — please try again.
          </div>
        )}

        {/* Undo toast */}
        {showUndoToast && <UndoToast onUndo={handleUndo} onDismiss={() => setShowUndoToast(false)} />}

        {/* Note row — shown when today's habit is complete */}
        {done && <NoteRow habitId={habit.id} date={todayStr} initialNote={todayNote} />}

        {/* Streak at-risk warning */}
        {habit.streakAtRisk && !showUndoToast && (
          <div className="anim-in" style={{
            margin: '10px 20px 0', padding: '10px 14px',
            background: 'var(--amber-bg, #fffbeb)', borderRadius: 'var(--radius)',
            border: '1px solid var(--amber, #f59e0b)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <ShieldAlert size={14} color="var(--amber, #f59e0b)" strokeWidth={2.5} />
            <span style={{ fontSize: 13, color: 'var(--amber, #b45309)', fontWeight: 600, flex: 1 }}>
              Complete today to keep your streak
            </span>
            {habit.freezesLeft > 0 && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={handleUseFreeze}
                disabled={freezing}
                style={{
                  color: freezeError ? 'var(--red)' : 'var(--blue, #3b82f6)',
                  borderColor: freezeError ? 'var(--red)' : 'var(--blue, #3b82f6)',
                  padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                }}
              >
                <Shield size={11} strokeWidth={2.5} />
                {freezing ? 'Saving…' : freezeError ? 'Failed' : 'Use freeze'}
              </button>
            )}
          </div>
        )}

        {/* ··· menu */}
        {showMenu && !showDelete && (
          <div className="anim-in" style={{
            margin: '10px 20px 0', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowMenu(false); setShowEdit(true); }}
              style={{
                width: '100%', justifyContent: 'flex-start', gap: 8,
                borderRadius: 0, borderBottom: '1px solid var(--border)',
                padding: '9px 14px', fontSize: 13,
              }}
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setShowDelete(true); }}
              style={{
                width: '100%', justifyContent: 'flex-start', gap: 8,
                borderRadius: 0, padding: '9px 14px', fontSize: 13,
                color: 'var(--red)',
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}

        {/* Delete confirm */}
        {showDelete && (
          <div className="anim-in" style={{
            margin: '12px 20px 0', padding: '11px 14px',
            background: 'var(--red-bg)', borderRadius: 'var(--radius)',
            border: '1px solid #fca5a5', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500, flex: 1 }}>Delete habit and all its data?</span>
            <button className="btn btn-sm btn-ghost" onClick={() => { setShowDelete(false); setShowMenu(false); }}>Cancel</button>
            <button className="btn btn-sm btn-danger" onClick={() => deleteHabit(habit.id)}>Delete</button>
          </div>
        )}

        {/* Heatmap */}
        <div style={{ padding: '16px 20px 0', overflowX: 'auto' }}>
          <MiniHeatmap completions={habit.completions.map(c => c.date)} color={habit.color} weeks={16} />
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
            {habit.freezesLeft > 0 && (
              <div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Freeze</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--blue, #3b82f6)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Shield size={11} strokeWidth={2.5} /> 1 left
                </span>
              </div>
            )}
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
    </>
  );
}, (prev, next) => {
  const todayDate = new Date().toISOString().split('T')[0];
  const prevNote = prev.habit.completions.find(c => c.date === todayDate)?.notes ?? null;
  const nextNote = next.habit.completions.find(c => c.date === todayDate)?.notes ?? null;
  return (
    prev.habit.id                 === next.habit.id &&
    prev.habit.name               === next.habit.name &&
    prev.habit.description        === next.habit.description &&
    prev.habit.color              === next.habit.color &&
    prev.habit.icon               === next.habit.icon &&
    prev.habit.completedToday     === next.habit.completedToday &&
    prev.habit.completedThisWeek  === next.habit.completedThisWeek &&
    prev.habit.streak             === next.habit.streak &&
    prev.habit.completions.length === next.habit.completions.length &&
    prev.habit.freezesLeft        === next.habit.freezesLeft &&
    prev.habit.streakAtRisk       === next.habit.streakAtRisk &&
    prevNote                      === nextNote &&
    prev.animDelay                === next.animDelay
  );
});
