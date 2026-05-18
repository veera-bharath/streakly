import { Router, Response } from 'express';
import { db } from '../store/db';
import { authenticate } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { today, calculateStreak, completionsThisWeek } from '../utils/streaks';
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
  const { data: completions } = await db
    .from('habit_completions')
    .select('date')
    .eq('habit_id', habit.id);

  const dates = (completions ?? []).map((c: { date: string }) => c.date);
  const frequencyType = habit.frequency_type ?? 'daily';
  const frequencyTarget = habit.frequency_target ?? 1;
  const { current, longest, streakUnit } = calculateStreak(dates, frequencyType, frequencyTarget);
  const todayStr = today();

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
    completedToday: dates.includes(todayStr),
    completedThisWeek: completionsThisWeek(dates),
  };
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
    io.to(`user:${req.userId}`).emit('habit:toggled', enriched);
    res.json(enriched);
  });

  return router;
}
