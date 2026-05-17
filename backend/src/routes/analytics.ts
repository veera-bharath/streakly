import { Router, Response } from 'express';
import { db } from '../store/db';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { toDateStr, calculateStreak } from '../utils/streaks';

const router = Router();
router.use(authenticate);

function getDatesBack(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return toDateStr(d);
  });
}

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

  const data = await Promise.all((habits ?? []).map(async (h: { id: string; name: string; color: string; icon: string }) => {
    const { data: comps } = await db.from('habit_completions').select('date').eq('habit_id', h.id);
    const dates = (comps ?? []).map((c: { date: string }) => c.date);
    const { current, longest } = calculateStreak(dates);
    return { id: h.id, name: h.name, color: h.color, icon: h.icon, current, longest, totalCompletions: dates.length };
  }));

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

export default router;
