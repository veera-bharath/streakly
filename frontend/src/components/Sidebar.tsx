import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const NAV = [
  { to: '/',          label: 'Dashboard', icon: '⊞',  mobileIcon: '⊞' },
  { to: '/analytics', label: 'Analytics', icon: '◉',  mobileIcon: '◉' },
  { to: '/heatmap',   label: 'Heatmap',   icon: '▦',  mobileIcon: '▦' },
];

export function Sidebar() {
  const { user, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 2px 8px rgba(22,163,74,.3)',
          }}>
            🔥
          </div>
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

      {/* Nav */}
      <div className="sidebar-nav" style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, label, icon }) => (
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
            onMouseEnter={e => { if (!(e.currentTarget as HTMLAnchorElement).classList.contains('active')) (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-2)'; }}
            onMouseLeave={e => { if (!(e.currentTarget as HTMLAnchorElement).getAttribute('aria-current')) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
          >
            <span style={{ fontSize: 17 }}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Footer */}
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
        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
