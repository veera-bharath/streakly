import { Router, Response } from 'express';
import { db } from '../store/db';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { calculateStreak } from '../utils/streaks';
import {
  getDatesBack,
  completionRate,
  bestDayOfWeek,
  worstDayOfWeek,
  consistencyScore,
  generateInsights,
  completionsByDayOfWeek,
  HabitSummary,
} from '../utils/analytics';

const router = Router();
router.use(authenticate);

/* ── Helpers ── */

type DbHabit = { id: string; name: string; color: string; icon: string; created_at: string; frequency_type: string; frequency_target: number };

async function fetchHabitsWithCompletions(userId: string) {
  const { data: habits } = await db.from('habits').select('*').eq('user_id', userId);
  if (!habits?.length) return [];

  return Promise.all(
    (habits as DbHabit[]).map(async h => {
      const { data: comps } = await db
        .from('habit_completions')
        .select('date')
        .eq('habit_id', h.id);
      const dates = (comps ?? []).map((c: { date: string }) => c.date);
      const { current } = calculateStreak(dates, (h.frequency_type as 'daily' | 'weekly') ?? 'daily', h.frequency_target ?? 1);
      return { ...h, completions: dates, streak: current };
    }),
  );
}

/* ── Existing endpoints ── */

router.get('/weekly', async (req: AuthenticatedRequest, res: Response) => {
  const dates = getDatesBack(7);
  const startDate = dates[0];

  const { data: habits } = await db.from('habits').select('id, name').eq('user_id', req.userId);
  const habitIds = (habits ?? []).map((h: { id: string }) => h.id);

  const { data: completions } = await db
    .from('habit_completions')
    .select('habit_id, date')
    .in('habit_id', habitIds.length ? habitIds : ['none'])
    .gte('date', startDate);

  const compSet = new Set((completions ?? []).map((c: { habit_id: string; date: string }) => `${c.habit_id}|${c.date}`));
  const total = habits?.length ?? 0;

  const data = dates.map(date => {
    const completed = (habits ?? []).filter((h: { id: string }) => compSet.has(`${h.id}|${date}`)).length;
    return { date, completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  res.json({ data, habits: (habits ?? []).map((h: { name: string }) => h.name) });
});

router.get('/monthly', async (req: AuthenticatedRequest, res: Response) => {
  const dates = getDatesBack(30);
  const startDate = dates[0];

  const { data: habits } = await db.from('habits').select('id').eq('user_id', req.userId);
  const habitIds = (habits ?? []).map((h: { id: string }) => h.id);

  const { data: completions } = await db
    .from('habit_completions')
    .select('habit_id, date')
    .in('habit_id', habitIds.length ? habitIds : ['none'])
    .gte('date', startDate);

  const compSet = new Set((completions ?? []).map((c: { habit_id: string; date: string }) => `${c.habit_id}|${c.date}`));
  const total = habits?.length ?? 0;

  const data = dates.map(date => {
    const completed = (habits ?? []).filter((h: { id: string }) => compSet.has(`${h.id}|${date}`)).length;
    return { date, completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  });

  res.json({ data });
});

router.get('/streaks', async (req: AuthenticatedRequest, res: Response) => {
  const { data: habits } = await db.from('habits').select('*').eq('user_id', req.userId);

  const data = await Promise.all(
    (habits ?? []).map(async (h: DbHabit) => {
      const { data: comps } = await db
        .from('habit_completions')
        .select('date')
        .eq('habit_id', h.id);
      const dates = (comps ?? []).map((c: { date: string }) => c.date);
      const { current, longest } = calculateStreak(
        dates,
        (h.frequency_type as 'daily' | 'weekly') ?? 'daily',
        h.frequency_target ?? 1,
      );
      return {
        id: h.id,
        name: h.name,
        color: h.color,
        icon: h.icon,
        current,
        longest,
        totalCompletions: dates.length,
      };
    }),
  );

  res.json(data);
});

router.get('/heatmap', async (req: AuthenticatedRequest, res: Response) => {
  const dates = getDatesBack(365);
  const startDate = dates[0];

  const { data: habits } = await db.from('habits').select('id').eq('user_id', req.userId);
  const habitIds = (habits ?? []).map((h: { id: string }) => h.id);
  const total = habits?.length ?? 0;

  const { data: completions } = await db
    .from('habit_completions')
    .select('habit_id, date')
    .in('habit_id', habitIds.length ? habitIds : ['none'])
    .gte('date', startDate);

  const countByDate: Record<string, number> = {};
  (completions ?? []).forEach((c: { date: string }) => {
    countByDate[c.date] = (countByDate[c.date] ?? 0) + 1;
  });

  const data = dates.map(date => {
    const completed = countByDate[date] ?? 0;
    return { date, completed, total, intensity: total > 0 ? completed / total : 0 };
  });

  res.json(data);
});

/* ── New endpoints ── */

router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  const habits = await fetchHabitsWithCompletions(req.userId!);
  if (!habits.length) {
    return res.json({
      completionRate7d: 0,
      completionRate30d: 0,
      bestDayOfWeek: '—',
      worstDayOfWeek: '—',
      consistencyScore: 0,
      insights: ['Add habits and start completing them to unlock insights.'],
      totalHabits: 0,
      activeStreaks: 0,
    });
  }

  const allCompletions = habits.map(h => h.completions);
  const allFlat = allCompletions.flat();

  // Aggregate completion rates across all habits
  const dates7 = getDatesBack(7);
  const dates30 = getDatesBack(30);
  const compSet = new Set(
    habits.flatMap(h => h.completions.map(d => `${h.id}|${d}`)),
  );

  const rate7 = dates7.length && habits.length
    ? Math.round(
        dates7.reduce((sum, d) => {
          const completed = habits.filter(h => compSet.has(`${h.id}|${d}`)).length;
          return sum + completed / habits.length;
        }, 0) / dates7.length * 100,
      )
    : 0;

  const rate30 = dates30.length && habits.length
    ? Math.round(
        dates30.reduce((sum, d) => {
          const completed = habits.filter(h => compSet.has(`${h.id}|${d}`)).length;
          return sum + completed / habits.length;
        }, 0) / dates30.length * 100,
      )
    : 0;

  const avgConsistency =
    habits.length > 0
      ? Math.round(
          habits.reduce((s, h) => s + consistencyScore(h.completions, h.created_at), 0) /
            habits.length,
        )
      : 0;

  const insightHabits: HabitSummary[] = habits.map(h => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    streak: h.streak,
    completions: h.completions,
    createdAt: h.created_at,
  }));

  res.json({
    completionRate7d: rate7,
    completionRate30d: rate30,
    bestDayOfWeek: allFlat.length > 0 ? bestDayOfWeek(allCompletions).name : '—',
    worstDayOfWeek: allFlat.length > 0 ? worstDayOfWeek(allCompletions).name : '—',
    consistencyScore: avgConsistency,
    insights: generateInsights(insightHabits),
    totalHabits: habits.length,
    activeStreaks: habits.filter(h => h.streak > 0).length,
  });
});

router.get('/trends', async (req: AuthenticatedRequest, res: Response) => {
  const dates7 = getDatesBack(7);
  const dates30 = getDatesBack(30);

  const { data: habits } = await db.from('habits').select('id').eq('user_id', req.userId);
  const habitIds = (habits ?? []).map((h: { id: string }) => h.id);
  const total = habits?.length ?? 0;

  const { data: completions30 } = await db
    .from('habit_completions')
    .select('habit_id, date')
    .in('habit_id', habitIds.length ? habitIds : ['none'])
    .gte('date', dates30[0]);

  const compSet = new Set(
    (completions30 ?? []).map((c: { habit_id: string; date: string }) => `${c.habit_id}|${c.date}`),
  );

  const toPoint = (date: string) => {
    const completed = (habits ?? []).filter((h: { id: string }) => compSet.has(`${h.id}|${date}`)).length;
    return { date, completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const allCompletionsPerHabit = await Promise.all(
    (habits ?? []).map(async (h: { id: string }) => {
      const { data } = await db
        .from('habit_completions')
        .select('date')
        .eq('habit_id', h.id);
      return (data ?? []).map((c: { date: string }) => c.date);
    }),
  );

  res.json({
    weekly: dates7.map(toPoint),
    monthly: dates30.map(toPoint),
    byDayOfWeek: completionsByDayOfWeek(allCompletionsPerHabit, total),
  });
});

export default router;
