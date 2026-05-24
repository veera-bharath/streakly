import { create } from 'zustand';
import { User, Habit, FrequencyType } from '../types';
import { api } from '../api/client';

interface Store {
  user: User | null;
  token: string | null;
  habits: Habit[];
  loading: boolean;
  openAddHabit: boolean;

  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setOpenAddHabit: (v: boolean) => void;
  fetchHabits: () => Promise<void>;
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  removeHabit: (id: string) => void;
  createHabit: (name: string, description?: string, frequencyType?: FrequencyType, frequencyTarget?: number) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabit: (id: string, date?: string) => Promise<void>;
  useFreeze: (id: string, date?: string) => Promise<void>;
  initAuth: () => Promise<boolean>;
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  token: localStorage.getItem('streakly_token'),
  habits: [],
  loading: false,
  openAddHabit: false,

  setOpenAddHabit: (v) => set({ openAddHabit: v }),

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

  createHabit: async (name, description, frequencyType = 'daily', frequencyTarget = 1) => {
    await api.habits.create({ name, description, frequencyType, frequencyTarget });
    // State update via socket 'habit:created' to avoid duplicate
  },

  deleteHabit: async (id) => {
    await api.habits.delete(id);
    get().removeHabit(id);
  },

  toggleHabit: async (id, date) => {
    const prev = get().habits.find(h => h.id === id);

    // Optimistic update — flip completedToday and adjust completions array
    if (prev) {
      const today = new Date().toISOString().split('T')[0];
      const target = date ?? today;
      const wasCompleted = prev.completions.includes(target);
      const nextCompletedToday = target === today ? !prev.completedToday : prev.completedToday;
      get().updateHabit({
        ...prev,
        completions: wasCompleted
          ? prev.completions.filter(d => d !== target)
          : [...prev.completions, target],
        completedToday: nextCompletedToday,
        completedThisWeek: wasCompleted
          ? Math.max(0, prev.completedThisWeek - 1)
          : prev.completedThisWeek + 1,
        // clear at-risk flag immediately when marking complete for today
        streakAtRisk: nextCompletedToday ? false : prev.streakAtRisk,
      });
    }

    try {
      const updated = await api.habits.toggle(id, date);
      get().updateHabit(updated); // reconcile with authoritative server data
    } catch (err) {
      if (prev) get().updateHabit(prev); // rollback
      throw err;
    }
  },

  useFreeze: async (id, date) => {
    const updated = await api.habits.useFreeze(id, date);
    get().updateHabit(updated);
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
