import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { FrequencyType } from '../types';

interface Props { onClose: () => void; }

const FREQ_LABELS: Record<FrequencyType, string> = {
  daily: 'Every day',
  weekly: 'X times per week',
};

export function AddHabitModal({ onClose }: Props) {
  const { createHabit } = useStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [frequencyTarget, setFrequencyTarget] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Habit name is required'); return; }
    setLoading(true); setError('');
    try {
      await createHabit(name.trim(), description.trim(), frequencyType, frequencyTarget);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create habit');
      setLoading(false);
    }
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
          <button onClick={onClose} className="btn-icon" style={{ color: 'var(--text-3)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Habit Name *
            </label>
            <input
              ref={inputRef} className="input" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Morning run, Read 20 pages" maxLength={60}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <input
              className="input" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional note or goal" maxLength={120}
            />
          </div>

          {/* Frequency type */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
              Frequency
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['daily', 'weekly'] as FrequencyType[]).map(ft => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFrequencyType(ft)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 'var(--radius)',
                    border: `1.5px solid ${frequencyType === ft ? 'var(--green)' : 'var(--border)'}`,
                    background: frequencyType === ft ? 'var(--green-bg)' : 'var(--surface-2)',
                    color: frequencyType === ft ? 'var(--green)' : 'var(--text-2)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  {ft === 'daily' ? 'Daily' : 'Weekly'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
              {FREQ_LABELS[frequencyType]}
            </div>
          </div>

          {/* Target (only for weekly) */}
          {frequencyType === 'weekly' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
                Target — {frequencyTarget}x per week
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFrequencyTarget(n)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: `1.5px solid ${frequencyTarget === n ? 'var(--blue)' : 'var(--border)'}`,
                      background: frequencyTarget === n ? 'var(--blue)' : 'var(--surface-2)',
                      color: frequencyTarget === n ? '#fff' : 'var(--text-2)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              fontSize: 13, color: 'var(--red)', background: 'var(--red-bg)',
              padding: '9px 13px', borderRadius: 'var(--radius)', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Creating…' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
