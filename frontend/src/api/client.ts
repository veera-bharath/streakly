import type { Habit, WeeklyData, MonthlyData, StreakData, HeatmapCell, AnalyticsOverview, AnalyticsTrends, FrequencyType } from '../types';

// VITE_API_URL is set to the Render backend URL in production CI builds
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

function getToken(): string | null {
  return localStorage.getItem('streakly_token');
}

export class ApiError extends Error {
  constructor(message: string, public readonly data: Record<string, unknown> = {}) {
    super(message);
  }
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
  if (!res.ok) throw new ApiError(data.error || 'Request failed', data);
  return data as T;
}

export const api = {
  auth: {
    register: (body: { username: string; email: string; password: string }) =>
      req<{ userId: string; message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    verifyEmail: (body: { userId: string; otp: string }) =>
      req<{ token: string; user: { id: string; username: string; email: string } }>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    resendOtp: (body: { userId: string }) =>
      req<{ message: string }>('/auth/resend-otp', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      req<{ token: string; user: { id: string; username: string; email: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => req<{ id: string; username: string; email: string }>('/auth/me'),
    forgotPassword: (body: { email: string }) =>
      req<{ message: string }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
    resetPassword: (body: { token: string; newPassword: string }) =>
      req<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  },
  habits: {
    list: () => req<Habit[]>('/habits'),
    create: (body: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      frequencyType?: FrequencyType;
      frequencyTarget?: number;
    }) => req<Habit>('/habits', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, patch: { name?: string; description?: string; color?: string; icon?: string }) =>
      req<Habit>(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
    delete: (id: string) => req<{ success: boolean }>(`/habits/${id}`, { method: 'DELETE' }),
    toggle: (id: string, date?: string, notes?: string) =>
      req<Habit>(`/habits/${id}/toggle`, { method: 'POST', body: JSON.stringify({ date, notes }) }),
    updateNote: (id: string, date: string, notes: string | null) =>
      req<Habit>(`/habits/${id}/completion`, { method: 'PATCH', body: JSON.stringify({ date, notes }) }),
    useFreeze: (id: string, date?: string) =>
      req<Habit>(`/habits/${id}/use-freeze`, { method: 'POST', body: JSON.stringify({ date }) }),
  },
  analytics: {
    weekly: () => req<{ data: WeeklyData[]; habits: string[] }>('/analytics/weekly'),
    monthly: () => req<{ data: MonthlyData[] }>('/analytics/monthly'),
    streaks: () => req<StreakData[]>('/analytics/streaks'),
    heatmap: () => req<HeatmapCell[]>('/analytics/heatmap'),
    overview: () => req<AnalyticsOverview>('/analytics/overview'),
    trends: () => req<AnalyticsTrends>('/analytics/trends'),
  },
};
