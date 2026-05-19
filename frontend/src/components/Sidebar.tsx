import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BarChart2, Grid3x3, LogOut, Plus, User, Sun, Moon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useThemeContext } from '../context/ThemeContext';
import logo from '../assets/streakly.png';

const NAV = [
  { to: '/',          label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', Icon: BarChart2 },
  { to: '/heatmap',   label: 'Heatmap',   Icon: Grid3x3 },
];

/* ─── Desktop sidebar (hidden on mobile) ─── */
export function Sidebar() {
  const { user, logout, setOpenAddHabit } = useStore();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { theme, toggle: toggleTheme } = useThemeContext();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="sidebar">
        <div className="sidebar-logo" style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logo} alt="Streakly" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.025em', color: 'var(--text)' }}>
                Streakly
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                HABIT TRACKER
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-nav" style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 'var(--radius)',
                fontSize: 14, fontWeight: 600,
                color: isActive ? 'var(--green)' : 'var(--text-2)',
                background: isActive ? 'var(--green-bg)' : 'transparent',
                transition: 'all .15s',
              })}
              onMouseEnter={e => { if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--green), #4ade80)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', gap: 7 }}>
              <LogOut size={14} />
              Sign out
            </button>
            <button onClick={toggleTheme} className="btn btn-ghost btn-sm btn-icon" title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile floating bottom nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {/* Dashboard */}
          <NavLink to="/" end className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={20} strokeWidth={2} />
            <span>Dashboard</span>
          </NavLink>

          {/* Analytics */}
          <NavLink to="/analytics" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <BarChart2 size={20} strokeWidth={2} />
            <span>Analytics</span>
          </NavLink>

          {/* Center + button */}
          <button className="bottom-nav-plus" onClick={() => setOpenAddHabit(true)} aria-label="Add habit">
            <Plus size={24} strokeWidth={2.5} />
          </button>

          {/* Heatmap */}
          <NavLink to="/heatmap" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>
            <Grid3x3 size={20} strokeWidth={2} />
            <span>Heatmap</span>
          </NavLink>

          {/* Profile */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              className="bottom-nav-item"
              onClick={() => setShowProfileMenu(p => !p)}
              style={{ width: '100%' }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--green), #4ade80)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0,
              }}>
                {user?.username?.[0]?.toUpperCase() ?? <User size={13} />}
              </div>
              <span>Profile</span>
            </button>

            {showProfileMenu && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  onClick={() => setShowProfileMenu(false)}
                />
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0,
                  marginBottom: 8, zIndex: 50,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: 12,
                  minWidth: 180,
                  animation: 'fadeUp .15s ease both',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{user?.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, justifyContent: 'center', gap: 7 }}
                      onClick={handleLogout}
                    >
                      <LogOut size={13} />
                      Sign out
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={toggleTheme}
                      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
