export function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function today(): string {
  return toDateStr(new Date());
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDateStr(d);
}

function calcDailyStreak(completions: string[]): { current: number; longest: number } {
  const sorted = [...new Set(completions)].sort();
  if (sorted.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (new Date(sorted[i] + 'T00:00:00').getTime() - new Date(sorted[i - 1] + 'T00:00:00').getTime()) /
      86400000;
    if (diff === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const todayStr = today();
  const yesterdayStr = addDays(todayStr, -1);
  const set = new Set(sorted);

  let current = 0;
  const start = set.has(todayStr) ? todayStr : set.has(yesterdayStr) ? yesterdayStr : null;
  if (start) {
    let d = start;
    while (set.has(d)) {
      current++;
      d = addDays(d, -1);
    }
  }

  return { current, longest };
}

function calcWeeklyStreak(
  completions: string[],
  target: number,
): { current: number; longest: number } {
  const weekCounts: Record<string, number> = {};
  for (const d of completions) {
    const monday = getWeekMonday(d);
    weekCounts[monday] = (weekCounts[monday] || 0) + 1;
  }

  const weeks = Object.keys(weekCounts).sort();
  if (weeks.length === 0) return { current: 0, longest: 0 };

  let longest = 0;
  let run = 0;
  for (let i = 0; i < weeks.length; i++) {
    if (i > 0) {
      const diffWeeks = Math.round(
        (new Date(weeks[i] + 'T00:00:00').getTime() -
          new Date(weeks[i - 1] + 'T00:00:00').getTime()) /
          (7 * 86400000),
      );
      if (diffWeeks > 1) run = 0;
    }
    if (weekCounts[weeks[i]] >= target) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  // Current streak: current week is "in progress" so only counts if target met
  const currentMonday = getWeekMonday(today());
  let current = (weekCounts[currentMonday] || 0) >= target ? 1 : 0;

  let checkWeek = addDays(currentMonday, -7);
  while (checkWeek >= weeks[0]) {
    if ((weekCounts[checkWeek] || 0) >= target) {
      current++;
      checkWeek = addDays(checkWeek, -7);
    } else {
      break;
    }
  }

  return { current, longest };
}

export function calculateStreak(
  completions: string[],
  frequencyType: 'daily' | 'weekly' = 'daily',
  frequencyTarget = 1,
): { current: number; longest: number; streakUnit: 'days' | 'weeks' } {
  if (completions.length === 0) {
    return { current: 0, longest: 0, streakUnit: frequencyType === 'weekly' ? 'weeks' : 'days' };
  }
  if (frequencyType === 'weekly') {
    const { current, longest } = calcWeeklyStreak(completions, frequencyTarget);
    return { current, longest, streakUnit: 'weeks' };
  }
  const { current, longest } = calcDailyStreak(completions);
  return { current, longest, streakUnit: 'days' };
}

export function completionsThisWeek(completions: string[]): number {
  const monday = getWeekMonday(today());
  const sunday = addDays(monday, 6);
  return completions.filter(d => d >= monday && d <= sunday).length;
}
