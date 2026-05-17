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
  completions: string[];
  createdAt: string;
  streak: number;
  longestStreak: number;
  completedToday: boolean;
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
