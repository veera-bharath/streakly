import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { WeeklyData, MonthlyData, StreakData, AnalyticsOverview, AnalyticsTrends } from '../types';
import { useStore } from '../store/useStore';

export function useAnalytics() {
  const { token, habits, fetchHabits } = useStore();

  const [weekly, setWeekly]     = useState<WeeklyData[]>([]);
  const [monthly, setMonthly]   = useState<MonthlyData[]>([]);
  const [streaks, setStreaks]   = useState<StreakData[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends]     = useState<AnalyticsTrends | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.analytics.weekly(),
      api.analytics.monthly(),
      api.analytics.streaks(),
      api.analytics.overview(),
      api.analytics.trends(),
    ])
      .then(([w, m, s, ov, tr]) => {
        setWeekly(w.data);
        setMonthly(m.data);
        setStreaks(s);
        setOverview(ov);
        setTrends(tr);
      })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  return { weekly, monthly, streaks, overview, trends, habits, loading, error };
}
