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
  completions: string[]; // ISO date strings "YYYY-MM-DD"
  createdAt: string;
}

export interface DB {
  users: User[];
  habits: Habit[];
}

export interface AuthRequest extends Express.Request {
  userId?: string;
}

import { Request } from 'express';
export interface AuthenticatedRequest extends Request {
  userId?: string;
}
