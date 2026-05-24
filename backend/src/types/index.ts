export type FrequencyType = 'daily' | 'weekly';

export interface Completion {
  date: string;
  notes: string | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  frequencyType: FrequencyType;
  frequencyTarget: number;
  completions: Completion[];
  createdAt: string;
  streak: number;
  longestStreak: number;
  streakUnit: 'days' | 'weeks';
  completedToday: boolean;
  completedThisWeek: number;
}

export interface DB {
  users: User[];
  habits: Habit[];
}

import { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export interface AnalyticsOverview {
  completionRate7d: number;
  completionRate30d: number;
  bestDayOfWeek: string;
  worstDayOfWeek: string;
  consistencyScore: number;
  insights: string[];
  totalHabits: number;
  activeStreaks: number;
}

export interface TrendPoint {
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface AnalyticsTrends {
  weekly: TrendPoint[];
  monthly: TrendPoint[];
  byDayOfWeek: { day: string; avg: number }[];
}
