import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { useSocket } from './hooks/useSocket';
import { useTheme } from './hooks/useTheme';
import { ThemeContext } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AddHabitModal } from './components/AddHabitModal';

const Analytics   = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const HeatmapPage = lazy(() => import('./pages/HeatmapPage').then(m => ({ default: m.HeatmapPage })));

function PageLoader() {
  return (
    <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );
}

function AppLayout() {
  useSocket();
  const { openAddHabit, setOpenAddHabit } = useStore();
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/heatmap"   element={<HeatmapPage />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {openAddHabit && <AddHabitModal onClose={() => setOpenAddHabit(false)} />}
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  const { initAuth, token } = useStore();
  const [ready, setReady] = useState(false);
  const themeCtx = useTheme();

  useEffect(() => {
    initAuth().finally(() => setReady(true));
  }, [initAuth]);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>
          streak<span style={{ color: 'var(--amber)' }}>ly</span>
        </div>
      </div>
    );
  }

  const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';

  return (
    <ThemeContext.Provider value={themeCtx}>
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/login"    element={token ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/*"        element={<RequireAuth><AppLayout /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
    </ThemeContext.Provider>
  );
}
