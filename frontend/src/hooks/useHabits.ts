import { useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function useHabits() {
  const { habits, fetchHabits, loading, toggleHabit, deleteHabit, createHabit } = useStore();

  useEffect(() => { fetchHabits(); }, [fetchHabits]);

  const yesterday = yesterdayStr();

  const stats = useMemo(() => {
    const total = habits.length;
    const completed = habits.filter(h => h.completedToday).length;
    const yCompleted = habits.filter(h => h.completions.includes(yesterday)).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const yPct = total > 0 ? Math.round((yCompleted / total) * 100) : 0;
    const topStreak = total > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
    return { total, completed, yCompleted, pct, yPct, topStreak };
  }, [habits, yesterday]);

  return { habits, loading, ...stats, toggleHabit, deleteHabit, createHabit };
}
