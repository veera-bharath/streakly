export type FrequencyType = 'daily' | 'weekly';

export interface User {
  id: string;
  username: string;
  email: string;
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
  completions: string[];
  createdAt: string;
  streak: number;
  longestStreak: number;
  streakUnit: 'days' | 'weeks';
  completedToday: boolean;
  completedThisWeek: number;
}

export interface WeeklyData {
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface MonthlyData {
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface StreakData {
  id: string;
  name: string;
  color: string;
  icon: string;
  current: number;
  longest: number;
  totalCompletions: number;
}

export interface HeatmapCell {
  date: string;
  completed: number;
  total: number;
  intensity: number;
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
