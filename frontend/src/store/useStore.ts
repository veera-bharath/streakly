import { create } from 'zustand';
import { User, Habit } from '../types';
import { api } from '../api/client';

interface Store {
  user: User | null;
  token: string | null;
  habits: Habit[];
  loading: boolean;

  setAuth: (token: string, user: User) => void;
  logout: () => void;
  fetchHabits: () => Promise<void>;
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  removeHabit: (id: string) => void;
  createHabit: (name: string, description?: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabit: (id: string, date?: string) => Promise<void>;
  initAuth: () => Promise<boolean>;
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  token: localStorage.getItem('streakly_token'),
  habits: [],
  loading: false,

  setAuth: (token, user) => {
    localStorage.setItem('streakly_token', token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('streakly_token');
    set({ token: null, user: null, habits: [] });
  },

  fetchHabits: async () => {
    set({ loading: true });
    try {
      const habits = await api.habits.list();
      set({ habits });
    } finally {
      set({ loading: false });
    }
  },

  addHabit: (h) => set(s => ({ habits: [...s.habits, h] })),
  updateHabit: (h) => set(s => ({ habits: s.habits.map(x => x.id === h.id ? h : x) })),
  removeHabit: (id) => set(s => ({ habits: s.habits.filter(x => x.id !== id) })),

  createHabit: async (name, description) => {
    await api.habits.create({ name, description });
    // State update handled by socket 'habit:created' event — do not addHabit here
    // to avoid the duplicate that occurs when socket fires before this awaits.
  },

  deleteHabit: async (id) => {
    await api.habits.delete(id);
    get().removeHabit(id);
  },

  toggleHabit: async (id, date) => {
    const habit = await api.habits.toggle(id, date);
    get().updateHabit(habit);
  },

  initAuth: async () => {
    const token = localStorage.getItem('streakly_token');
    if (!token) return false;
    try {
      const user = await api.auth.me();
      set({ user, token });
      return true;
    } catch {
      localStorage.removeItem('streakly_token');
      set({ token: null, user: null });
      return false;
    }
  },
}));
