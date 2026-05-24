import { useState, FormEvent, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/useStore';
import logo from '../assets/streakly.png';

type Step = 'form' | 'otp';

export function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useStore();

  // Support being redirected here from Login with an unverified userId
  const locationState = location.state as { userId?: string; email?: string } | null;

  const [step, setStep] = useState<Step>(locationState?.userId ? 'otp' : 'form');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState(locationState?.email ?? '');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState(locationState?.userId ?? '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Resend cooldown — pre-set to 60 when redirected from Login (OTP already sent by server)
  const [resendCooldown, setResendCooldown] = useState(locationState?.userId ? 60 : 0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCooldown() {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(s => {
        if (s <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  // Kick off the interval tick if we mounted already in cooldown (redirect path)
  useEffect(() => {
    if (resendCooldown > 0 && !cooldownRef.current) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown(s => {
          if (s <= 1) { clearInterval(cooldownRef.current!); return 0; }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Step 1: submit registration form ---
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const { userId: id } = await api.auth.register({ username, email, password });
      setUserId(id);
      setStep('otp');
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: submit OTP ---
  const handleVerify = async (code: string) => {
    if (code.length !== 6) return;
    setLoading(true); setError('');
    try {
      const { token, user } = await api.auth.verifyEmail({ userId, otp: code });
      setAuth(token, user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setError('');
    if (digits.length === 6) handleVerify(digits);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true); setError('');
    try {
      await api.auth.resendOtp({ userId });
      setOtp('');
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
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

        {step === 'form' ? (
          <>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em', marginBottom: 6 }}>Create your account</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Start building better habits today</div>
            </div>

            <div className="card" style={{ padding: 28 }}>
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Username</label>
                  <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="your_name" required autoFocus />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Email</label>
                  <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Password</label>
                  <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required />
                </div>

                {error && (
                  <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 'var(--radius)', fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }} disabled={loading}>
                  {loading ? 'Creating…' : 'Create Account →'}
                </button>
              </form>
            </div>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-2)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--green)', fontWeight: 700 }}>Sign in</Link>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.025em', marginBottom: 6 }}>Check your inbox</div>
              <div style={{ fontSize: 14, color: 'var(--text-2)' }}>
                We sent a 6-digit code to <strong style={{ color: 'var(--text)' }}>{email}</strong>
              </div>
            </div>

            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 10, textAlign: 'center' }}>
                    Enter verification code
                  </label>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => handleOtpChange(e.target.value)}
                    placeholder="000000"
                    autoFocus
                    disabled={loading}
                    style={{
                      textAlign: 'center',
                      fontSize: 28,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.3em',
                      padding: '14px',
                    }}
                  />
                </div>

                {error && (
                  <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '10px 14px', borderRadius: 'var(--radius)', fontWeight: 500 }}>
                    {error}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  disabled={loading || otp.length !== 6}
                  onClick={() => handleVerify(otp)}
                >
                  {loading ? 'Verifying…' : 'Verify Email →'}
                </button>

                <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)' }}>
                  {resendCooldown > 0 ? (
                    <span>Resend code in {resendCooldown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading}
                      style={{ background: 'none', border: 'none', color: 'var(--green)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0 }}
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-2)' }}>
              <button
                type="button"
                onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14, padding: 0 }}
              >
                ← Use a different email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
