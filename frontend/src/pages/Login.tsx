import { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/useStore';
import logo from '../assets/streakly.png';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const successMessage = (location.state as { message?: string } | null)?.message ?? '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { token, user } = await api.auth.login({ email, password });
      setAuth(token, user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Left panel */}
      <div style={{
        display: 'none',
        flex: 1, background: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)',
        alignItems: 'center', justifyContent: 'center', padding: 48,
      }}
        className="auth-left"
      >
        <div style={{ color: '#fff', maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>🔥</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', marginBottom: 16 }}>
            Build habits that stick.
          </div>
          <div style={{ fontSize: 16, opacity: .85, lineHeight: 1.6 }}>
            Track your daily habits, visualise your streaks, and stay consistent — one day at a time.
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="anim-up" style={{ width: '100%', maxWidth: 400 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <img src={logo} alt="Streakly" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover' }} />
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.025em' }}>Streakly</div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em', marginBottom: 6 }}>Welcome back</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Sign in to continue your streak</div>
          </div>

          {successMessage && (
            <div style={{ fontSize: 13, color: '#00c853', background: 'rgba(0,200,83,.1)', padding: '10px 14px', borderRadius: 'var(--radius)', fontWeight: 500, marginBottom: 16 }}>
              {successMessage}
            </div>
          )}

          <div className="card" style={{ padding: 28 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                <div style={{ textAlign: 'right', marginTop: 6 }}>
                  <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--text-2)', textDecoration: 'none' }}>
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 'var(--radius)', fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }} disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In →'}
              </button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-2)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--green)', fontWeight: 700 }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
