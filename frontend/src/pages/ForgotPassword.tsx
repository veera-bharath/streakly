import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import logo from '../assets/streakly.png';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.auth.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div className="anim-up" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <img src={logo} alt="Streakly" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover' }} />
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.025em' }}>Streakly</div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em', marginBottom: 6 }}>Forgot your password?</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Enter your email and we'll send you a reset link.</div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {success ? (
            <div style={{ fontSize: 14, color: '#00c853', background: 'rgba(0,200,83,.1)', padding: '14px 16px', borderRadius: 'var(--radius)', fontWeight: 500, lineHeight: 1.5 }}>
              Check your inbox — a reset link is on its way.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>

              {error && (
                <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 'var(--radius)', fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }} disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link →'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-2)' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--green)', fontWeight: 700 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
