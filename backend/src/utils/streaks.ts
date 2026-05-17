export function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function today(): string {
  return toDateStr(new Date());
}

export function calculateStreak(completions: string[]): { current: number; longest: number } {
  if (completions.length === 0) return { current: 0, longest: 0 };

  const sorted = [...new Set(completions)].sort();
  let longest = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current streak: count backwards from today
  const todayStr = today();
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  const set = new Set(sorted);

  let current = 0;
  let check = set.has(todayStr) ? todayStr : (set.has(yesterday) ? yesterday : null);
  if (check) {
    let d = new Date(check);
    while (set.has(toDateStr(d))) {
      current++;
      d = new Date(d.getTime() - 86400000);
    }
  }

  return { current, longest };
}
