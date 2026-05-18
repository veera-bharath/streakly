import { toDateStr } from './streaks';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getDatesBack(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return toDateStr(d);
  });
}

export function completionRate(completions: string[], days: number): number {
  const dates = getDatesBack(days);
  const set = new Set(completions);
  const matched = dates.filter(d => set.has(d)).length;
  return days > 0 ? Math.round((matched / days) * 100) : 0;
}

export function bestDayOfWeek(allCompletions: string[][]): { name: string; index: number } {
  const counts = Array(7).fill(0);
  for (const comps of allCompletions) {
    for (const d of comps) counts[new Date(d + 'T00:00:00').getDay()]++;
  }
  const idx = counts.indexOf(Math.max(...counts));
  return { name: DAY_NAMES[idx], index: idx };
}

export function worstDayOfWeek(allCompletions: string[][]): { name: string; index: number } {
  const counts = Array(7).fill(0);
  for (const comps of allCompletions) {
    for (const d of comps) counts[new Date(d + 'T00:00:00').getDay()]++;
  }
  const nonZero = counts.map((c, i) => ({ c, i })).filter(x => x.c > 0);
  if (nonZero.length === 0) return { name: DAY_NAMES[0], index: 0 };
  const min = nonZero.reduce((a, b) => (b.c < a.c ? b : a));
  return { name: DAY_NAMES[min.i], index: min.i };
}

export function consistencyScore(completions: string[], createdAt: string): number {
  const ageInDays = Math.max(
    1,
    Math.round((Date.now() - new Date(createdAt).getTime()) / 86400000),
  );
  const w30 = Math.min(30, ageInDays);
  const w7 = Math.min(7, ageInDays);
  const rate30 = completionRate(completions, w30);
  const rate7 = completionRate(completions, w7);
  return Math.round(rate30 * 0.6 + rate7 * 0.4);
}

export interface HabitSummary {
  id: string;
  name: string;
  icon: string;
  streak: number;
  completions: string[];
  createdAt: string;
}

export function generateInsights(habits: HabitSummary[]): string[] {
  if (habits.length === 0) return ['Add habits and start completing them to unlock insights.'];

  const allFlat = habits.flatMap(h => h.completions);
  if (allFlat.length < 5) {
    return ['Complete more habits over several days to unlock personalised insights.'];
  }

  const insights: string[] = [];
  const allCompletions = habits.map(h => h.completions);
  const rates = habits.map(h => ({ ...h, rate: completionRate(h.completions, 30) }));
  const best = bestDayOfWeek(allCompletions);
  const worst = worstDayOfWeek(allCompletions);

  insights.push(`You are most consistent on ${best.name}s`);

  if (allFlat.length >= 14) {
    const weekendCount = allFlat.filter(d => {
      const day = new Date(d + 'T00:00:00').getDay();
      return day === 0 || day === 6;
    }).length;
    const weekdayCount = allFlat.length - weekendCount;
    const weekdayAvg = weekdayCount / 5;
    const weekendAvg = weekendCount / 2;

    if (weekdayAvg > weekendAvg * 1.5) {
      insights.push('You miss habits mostly on weekends — try scheduling them the night before');
    } else if (weekendAvg >= weekdayAvg * 1.3) {
      insights.push('You are more consistent on weekends than on weekdays');
    }

    if (worst.name !== best.name) {
      insights.push(`Try setting a reminder for ${worst.name}s — that is when you slip most`);
    }
  }

  const bestHabit = rates.reduce((a, b) => (b.rate > a.rate ? b : a));
  if (bestHabit.rate >= 70) {
    insights.push(
      `${bestHabit.icon} "${bestHabit.name}" is your strongest habit at ${bestHabit.rate}% this month`,
    );
  }

  if (habits.length > 1) {
    const worstHabit = rates.reduce((a, b) => (b.rate < a.rate ? b : a));
    if (worstHabit.id !== bestHabit.id && worstHabit.rate < 40) {
      insights.push(
        `${worstHabit.icon} "${worstHabit.name}" needs attention — only ${worstHabit.rate}% completion last month`,
      );
    }
  }

  const topStreak = habits.reduce((a, b) => (b.streak > a.streak ? b : a));
  if (topStreak.streak >= 7) {
    insights.push(
      `${topStreak.icon} "${topStreak.name}" is on a ${topStreak.streak}-day streak — keep the chain alive!`,
    );
  }

  return insights;
}

export function completionsByDayOfWeek(
  allCompletions: string[][],
  habitCount: number,
): { day: string; avg: number }[] {
  const counts = Array(7).fill(0);
  const occurrences = Array(7).fill(0);

  for (const comps of allCompletions) {
    for (const d of comps) counts[new Date(d + 'T00:00:00').getDay()]++;
  }

  const dates = getDatesBack(90);
  for (const d of dates) occurrences[new Date(d + 'T00:00:00').getDay()]++;

  return DAY_NAMES.map((name, i) => ({
    day: name.slice(0, 3),
    avg:
      occurrences[i] > 0 && habitCount > 0
        ? Math.round((counts[i] / (occurrences[i] * habitCount)) * 100)
        : 0,
  }));
}
