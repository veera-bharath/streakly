import { useState } from 'react';
import { Habit } from '../types';
import { useStore } from '../store/useStore';
import { MiniHeatmap } from './MiniHeatmap';

interface Props {
  habit: Habit;
  animDelay?: number;
}

export function HabitCard({ habit, animDelay = 0 }: Props) {
  const { toggleHabit, deleteHabit } = useStore();
  const [toggling, setToggling] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const done = habit.completedToday;

  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    try { await toggleHabit(habit.id); } finally { setToggling(false); }
  };

  const completionRate = (() => {
    if (!habit.completions.length) return 0;
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split('T')[0];
    });
    return Math.round(last30.filter(d => habit.completions.includes(d)).length / 30 * 100);
  })();

  return (
    <div
      className="card card-hover anim-up"
      style={{
        animationDelay: `${animDelay}ms`,
        padding: '0',
        borderLeft: `4px solid ${habit.color}`,
        overflow: 'hidden',
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
            style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              border: `2px solid ${done ? habit.color : 'var(--border-2)'}`,
              background: done ? habit.color : 'transparent',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
              transition: 'all .25s cubic-bezier(.4,0,.2,1)',
              cursor: toggling ? 'wait' : 'pointer',
              animation: done && !toggling ? 'checkPop .35s ease' : 'none',
              boxShadow: done ? `0 2px 8px ${habit.color}55` : 'none',
            }}
          >
            {toggling
              ? <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #fff', borderTopColor: 'transparent', display: 'block', animation: 'spin .6s linear infinite' }} />
              : done ? '✓' : ''
            }
          </button>

          {/* Name + description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' }}>
                {habit.icon} {habit.name}
              </span>
              {done && <span className="badge badge-green">✓ Done</span>}
            </div>
            {habit.description && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {habit.description}
              </div>
            )}
          </div>

          {/* Streak + menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {/* Streak badge */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, lineHeight: 1,
                color: habit.streak > 0 ? habit.color : 'var(--text-3)',
              }}>
                {habit.streak > 0 && <span style={{ fontSize: 14 }}>🔥</span>} {habit.streak}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>
                {habit.streak === 1 ? 'day' : 'days'}
              </div>
            </div>

            {/* Menu */}
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

      {/* Delete confirm */}
      {showDelete && (
        <div className="anim-in" style={{
          margin: '12px 20px 0',
          padding: '11px 14px',
          background: 'var(--red-bg)', borderRadius: 'var(--radius)',
          border: '1px solid #fca5a5',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500, flex: 1 }}>
            Delete habit and all its data?
          </span>
          <button className="btn btn-sm btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button>
          <button className="btn btn-sm btn-danger" onClick={() => deleteHabit(habit.id)}>Delete</button>
        </div>
      )}

      {/* Heatmap */}
      <div style={{ padding: '16px 20px 0', overflowX: 'auto' }}>
        <MiniHeatmap completions={habit.completions} color={habit.color} weeks={16} />
      </div>

      {/* Footer stats */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        padding: '12px 20px 16px',
        borderTop: '1px solid var(--border)',
        marginTop: 14,
      }}>
        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 16, flex: 1 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Best streak</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{habit.longestStreak}d</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>Total</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{habit.completions.length}</span>
          </div>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>30d rate</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: completionRate >= 70 ? 'var(--green)' : completionRate >= 40 ? 'var(--amber)' : 'var(--red)' }}>
              {completionRate}%
            </span>
          </div>
        </div>

        {/* Complete button */}
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
}
