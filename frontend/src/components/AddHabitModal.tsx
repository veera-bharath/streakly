import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';

interface Props { onClose: () => void; }

export function AddHabitModal({ onClose }: Props) {
  const { createHabit } = useStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Habit name is required'); return; }
    setLoading(true); setError('');
    try { await createHabit(name.trim(), description.trim()); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to create habit'); setLoading(false); }
  };

  return (
    <div
      className="anim-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(26,25,22,.45)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card anim-up" style={{ width: '100%', maxWidth: 440, padding: 28, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>New Habit</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3 }}>Build something that lasts</div>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ color: 'var(--text-3)', fontSize: 18 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Habit Name *
            </label>
            <input ref={inputRef} className="input" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Morning run, Read 20 pages" maxLength={60} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Optional note or goal" maxLength={120} />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)', padding: '9px 13px', borderRadius: 'var(--radius)', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating…' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
