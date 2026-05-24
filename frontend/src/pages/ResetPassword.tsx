import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import logo from '../assets/streakly.png';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.auth.resetPassword({ token, newPassword });
      navigate('/login', { state: { message: 'Password updated. Please sign in.' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 16 }}>Invalid reset link.</div>
          <Link to="/forgot-password" style={{ color: 'var(--green)', fontWeight: 700 }}>Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
      <div className="anim-up" style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <img src={logo} alt="Streakly" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover' }} />
          <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.025em' }}>Streakly</div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em', marginBottom: 6 }}>Set a new password</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Choose a strong password to secure your account.</div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>New Password</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" required autoFocus />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Confirm Password</label>
              <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat your password" required />
            </div>

            {error && (
              <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 'var(--radius)', fontWeight: 500 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }} disabled={loading}>
              {loading ? 'Saving…' : 'Set New Password →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-2)' }}>
          <Link to="/login" style={{ color: 'var(--green)', fontWeight: 700 }}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
