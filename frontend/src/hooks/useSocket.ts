import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import { Habit } from '../types';

let socket: Socket | null = null;

export function useSocket() {
  const { token, addHabit, updateHabit, removeHabit } = useStore();

  useEffect(() => {
    if (!token) { socket?.disconnect(); socket = null; return; }

    const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'http://localhost:3001';
    socket = io(wsUrl, { auth: { token } });

    socket.on('habit:created', (h: Habit) => addHabit(h));
    socket.on('habit:toggled', (h: Habit) => updateHabit(h));
    socket.on('habit:updated', (h: Habit) => updateHabit(h));
    socket.on('habit:deleted', ({ id }: { id: string }) => removeHabit(id));

    return () => { socket?.disconnect(); socket = null; };
  }, [token, addHabit, updateHabit, removeHabit]);
}
