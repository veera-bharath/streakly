const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('streakly_token');
}

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  auth: {
    register: (body: { username: string; email: string; password: string }) =>
      req<{ token: string; user: { id: string; username: string; email: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    login: (body: { email: string; password: string }) =>
      req<{ token: string; user: { id: string; username: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => req<{ id: string; username: string; email: string }>('/auth/me'),
  },
  habits: {
    list: () => req<import('../types').Habit[]>('/habits'),
    create: (body: { name: string; description?: string; color?: string; icon?: string }) =>
      req<import('../types').Habit>('/habits', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: string) => req<{ success: boolean }>(`/habits/${id}`, { method: 'DELETE' }),
    toggle: (id: string, date?: string) =>
      req<import('../types').Habit>(`/habits/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ date }),
      }),
  },
  analytics: {
    weekly: () => req<{ data: import('../types').WeeklyData[]; habits: string[] }>('/analytics/weekly'),
    monthly: () => req<{ data: import('../types').MonthlyData[] }>('/analytics/monthly'),
    streaks: () => req<import('../types').StreakData[]>('/analytics/streaks'),
    heatmap: () => req<import('../types').HeatmapCell[]>('/analytics/heatmap'),
  },
};
