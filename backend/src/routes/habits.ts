import { Router, Response } from 'express';
import { db } from '../store/db';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { today, addDays, getWeekMonday, calculateStreakWithFreezes, completionsThisWeek } from '../utils/streaks';
import { Server } from 'socket.io';

const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];
const ICONS  = ['🔥', '💪', '📚', '🏃', '🧘', '💧', '🎯', '✍️', '🎵', '🌱'];

type DbHabit = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  created_at: string;
  user_id: string;
  frequency_type: 'daily' | 'weekly';
  frequency_target: number;
};

async function enrichHabit(habit: DbHabit) {
  const todayStr = today();
  const weekStart = getWeekMonday(todayStr);

  const [completionsRes, freezesRes, freezeCountRes] = await Promise.all([
    db.from('habit_completions').select('date').eq('habit_id', habit.id),
    db.from('streak_freezes')
      .select('used_on')
      .eq('habit_id', habit.id)
      .eq('user_id', habit.user_id)
      .not('used_on', 'is', null),
    db.from('streak_freezes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', habit.user_id)
      .eq('week_start', weekStart)
      .not('used_on', 'is', null),
  ]);

  const dates = (completionsRes.data ?? []).map((c: { date: string }) => c.date);
  const freezeDates = (freezesRes.data ?? []).map((f: { used_on: string }) => f.used_on);

  const frequencyType = habit.frequency_type ?? 'daily';
  const frequencyTarget = habit.frequency_target ?? 1;
  const { current, longest, streakUnit } = calculateStreakWithFreezes(dates, freezeDates, frequencyType, frequencyTarget);

  const completedToday = dates.includes(todayStr);
  const frozenToday = freezeDates.includes(todayStr);
  const freezesUsedThisWeek = freezeCountRes.count ?? 0;
  const freezesLeft = Math.max(0, 1 - freezesUsedThisWeek);
  const streakAtRisk = current > 0 && !completedToday && !frozenToday && frequencyType === 'daily';

  return {
    id: habit.id,
    userId: habit.user_id,
    name: habit.name,
    description: habit.description,
    color: habit.color,
    icon: habit.icon,
    frequencyType,
    frequencyTarget,
    createdAt: habit.created_at,
    completions: dates,
    streak: current,
    longestStreak: longest,
    streakUnit,
    completedToday,
    completedThisWeek: completionsThisWeek(dates),
    freezesLeft,
    freezesUsedThisWeek,
    streakAtRisk,
  };
}

async function updateHabitStats(habitId: string, enriched: Awaited<ReturnType<typeof enrichHabit>>) {
  const lastCompleted = [...enriched.completions].sort().at(-1) ?? null;
  await db.from('habit_stats').upsert({
    habit_id: habitId,
    current_streak: enriched.streak,
    longest_streak: enriched.longestStreak,
    last_completed_date: lastCompleted,
    updated_at: new Date().toISOString(),
  });
}

export function createHabitsRouter(io: Server) {
  const router = Router();
  router.use(authenticate);

  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    const { data: habits, error } = await db
      .from('habits')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: true });

    if (error) { res.status(500).json({ error: error.message }); return; }

    const enriched = await Promise.all((habits ?? []).map(enrichHabit));
    res.json(enriched);
  });

  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      description = '',
      color,
      icon,
      frequencyType = 'daily',
      frequencyTarget = 1,
    } = req.body;

    if (!name?.trim()) { res.status(400).json({ error: 'Name is required' }); return; }
    if (!['daily', 'weekly'].includes(frequencyType)) {
      res.status(400).json({ error: 'frequencyType must be daily or weekly' }); return;
    }
    const target = Math.max(1, Math.min(7, Number(frequencyTarget) || 1));

    const { count } = await db
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.userId);
    const idx = (count ?? 0) % COLORS.length;

    const { data: habit, error } = await db
      .from('habits')
      .insert({
        user_id: req.userId,
        name: name.trim(),
        description,
        color: color || COLORS[idx],
        icon: icon || ICONS[idx],
        frequency_type: frequencyType,
        frequency_target: target,
      })
      .select('*')
      .single();

    if (error) { res.status(500).json({ error: error.message }); return; }

    const enriched = await enrichHabit(habit);
    io.to(`user:${req.userId}`).emit('habit:created', enriched);
    res.status(201).json(enriched);
  });

  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    const { error } = await db
      .from('habits')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) { res.status(500).json({ error: error.message }); return; }

    io.to(`user:${req.userId}`).emit('habit:deleted', { id: req.params.id });
    res.json({ success: true });
  });

  router.post('/:id/toggle', async (req: AuthenticatedRequest, res: Response) => {
    const targetDate = req.body.date || today();
    const habitId = req.params.id;

    const { data: existing } = await db
      .from('habit_completions')
      .select('id')
      .eq('habit_id', habitId)
      .eq('date', targetDate)
      .single();

    if (existing) {
      await db.from('habit_completions').delete().eq('id', existing.id);
    } else {
      await db
        .from('habit_completions')
        .insert({ habit_id: habitId, user_id: req.userId, date: targetDate });
    }

    const { data: habit, error } = await db
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', req.userId)
      .single();

    if (error || !habit) { res.status(404).json({ error: 'Habit not found' }); return; }

    const enriched = await enrichHabit(habit);
    await updateHabitStats(habitId, enriched);
    io.to(`user:${req.userId}`).emit('habit:toggled', enriched);
    res.json(enriched);
  });

  // Returns cached streak data + live freeze availability
  router.get('/:id/streak', async (req: AuthenticatedRequest, res: Response) => {
    const habitId = req.params.id;

    const { data: habit } = await db
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', req.userId)
      .single();

    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }

    const todayStr = today();
    const weekStart = getWeekMonday(todayStr);

    const [statsRes, freezeCountRes, frozenTodayRes] = await Promise.all([
      db.from('habit_stats').select('*').eq('habit_id', habitId).single(),
      db.from('streak_freezes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.userId)
        .eq('week_start', weekStart)
        .not('used_on', 'is', null),
      db.from('streak_freezes')
        .select('id')
        .eq('habit_id', habitId)
        .eq('used_on', todayStr)
        .single(),
    ]);

    const freezesUsedThisWeek = freezeCountRes.count ?? 0;
    const freezesLeft = Math.max(0, 1 - freezesUsedThisWeek);
    const frozenToday = !!frozenTodayRes.data;

    let currentStreak: number;
    let longestStreak: number;
    let completedToday: boolean;

    if (statsRes.data) {
      currentStreak = statsRes.data.current_streak;
      longestStreak = statsRes.data.longest_streak;
      completedToday = statsRes.data.last_completed_date === todayStr;
    } else {
      const enriched = await enrichHabit(habit);
      currentStreak = enriched.streak;
      longestStreak = enriched.longestStreak;
      completedToday = enriched.completedToday;
    }

    const streakAtRisk = currentStreak > 0 && !completedToday && !frozenToday && habit.frequency_type === 'daily';

    res.json({
      currentStreak,
      longestStreak,
      freezesLeft,
      freezesUsedThisWeek,
      completedToday,
      streakAtRisk,
    });
  });

  // Manually apply a freeze to a missed day
  router.post('/:id/use-freeze', async (req: AuthenticatedRequest, res: Response) => {
    const habitId = req.params.id;
    const targetDate = req.body.date ?? addDays(today(), -1);

    const { data: habit } = await db
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', req.userId)
      .single();

    if (!habit) { res.status(404).json({ error: 'Habit not found' }); return; }

    // Reject future dates
    if (targetDate > today()) {
      res.status(400).json({ error: 'Cannot apply a freeze to a future date' });
      return;
    }

    const [completionRes, existingFreezeRes] = await Promise.all([
      db.from('habit_completions').select('id').eq('habit_id', habitId).eq('date', targetDate).single(),
      db.from('streak_freezes').select('id').eq('habit_id', habitId).eq('used_on', targetDate).single(),
    ]);

    if (completionRes.data) {
      res.status(400).json({ error: 'Habit was already completed on that date — no freeze needed' });
      return;
    }

    if (existingFreezeRes.data) {
      res.status(400).json({ error: 'A freeze is already applied for that date' });
      return;
    }

    const weekStart = getWeekMonday(targetDate);
    const { count: usedThisWeek } = await db
      .from('streak_freezes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId)
      .eq('week_start', weekStart)
      .not('used_on', 'is', null);

    if ((usedThisWeek ?? 0) >= 1) {
      res.status(400).json({ error: 'No freezes available for this week' });
      return;
    }

    const { error: insertError } = await db.from('streak_freezes').insert({
      user_id: req.userId,
      habit_id: habitId,
      week_start: weekStart,
      used_on: targetDate,
    });

    if (insertError) { res.status(500).json({ error: insertError.message }); return; }

    const enriched = await enrichHabit(habit);
    await updateHabitStats(habitId, enriched);
    io.to(`user:${req.userId}`).emit('habit:toggled', enriched);
    res.json(enriched);
  });

  return router;
}
