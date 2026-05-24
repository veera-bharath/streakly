import { useState } from 'react';
import { Grid3x3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Skeleton } from '../components/Skeleton';

/* ─── Types ─── */
type Range = 30 | 90 | 365;

/* ─── Helpers ─── */
function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
function formatDate(str: string) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ─── Full heatmap with tooltip ─── */
function HabitHeatmap({ completions, color, weeks }: { completions: string[]; color: string; weeks: number }) {
  const [tooltip, setTooltip] = useState<{ date: string; done: boolean; x: number; y: number } | null>(null);
  const set = new Set(completions);

  const CELL = 13;
  const GAP  = 3;

  const today = new Date();
  const todayDow = today.getDay() || 7;
  const totalDays = weeks * 7;

  const days: (string | null)[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  for (let i = 0; i < 7 - todayDow; i++) days.push(null);

  const cols: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let lastMonth = -1;
  cols.forEach((col, ci) => {
    const real = col.find(c => c);
    if (real) {
      const m = new Date(real + 'T00:00:00').getMonth();
      if (m !== lastMonth) { monthLabels.push({ label: MONTHS[m], col: ci }); lastMonth = m; }
    }
  });

  const W = cols.length * (CELL + GAP);
  const H = 7 * (CELL + GAP) + 18;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
          {/* Month labels */}
          {monthLabels.map(({ label, col }) => (
            <text key={`${label}-${col}`} x={col * (CELL + GAP)} y={10} fontSize={10} fill="var(--text-3)" fontFamily="Plus Jakarta Sans" fontWeight={600}>
              {label}
            </text>
          ))}
          {/* Cells */}
          {cols.map((col, ci) =>
            col.map((date, ri) => {
              if (!date) return null;
              const done = set.has(date);
              const future = date > toDateStr(today);
              return (
                <rect
                  key={`${ci}-${ri}`}
                  x={ci * (CELL + GAP)} y={14 + ri * (CELL + GAP)}
                  width={CELL} height={CELL} rx={2}
                  fill={future ? 'transparent' : done ? color : 'var(--surface-2)'}
                  opacity={future ? 0 : done ? 1 : 0.55}
                  style={{ cursor: future ? 'default' : 'pointer', transition: 'opacity .1s' }}
                  onMouseEnter={e => {
                    if (future) return;
                    const r = (e.target as SVGRectElement).getBoundingClientRect();
                    setTooltip({ date, done, x: r.left + r.width / 2, y: r.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="tooltip-box" style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}>
          <span style={{ opacity: .7 }}>{formatDate(tooltip.date)}</span>{'  '}
          <span style={{ color: tooltip.done ? '#4ade80' : '#f87171' }}>
            {tooltip.done ? '✓ Done' : '✗ Missed'}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Legend ─── */
function HeatmapLegend({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
      <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Less</span>
      {['var(--surface-2)', `${color}40`, `${color}70`, `${color}99`, color].map((c, i) => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: 2, background: c, border: '1px solid var(--border)' }} />
      ))}
      <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>More</span>
    </div>
  );
}

/* ─── Page ─── */
export function HeatmapPage() {
  const { habits, loading } = useStore();
  const [range, setRange] = useState<Range>(365);

  const weeks = range === 30 ? 5 : range === 90 ? 13 : 52;

  const RANGES: { label: string; value: Range }[] = [
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
    { label: '1 year',  value: 365 },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 className="section-title">Contribution Map</h1>
          <p className="section-sub">Your habit history, day by day</p>
        </div>
        {/* Time range filter */}
        <div className="seg-control">
          {RANGES.map(r => (
            <button
              key={r.value}
              className={`seg-btn${range === r.value ? ' active' : ''}`}
              onClick={() => setRange(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && habits.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <Skeleton width={32} height={32} borderRadius="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Skeleton width="40%" height={15} />
                  <Skeleton width="25%" height={11} />
                </div>
              </div>
              <Skeleton height={range === 30 ? 55 : range === 90 ? 100 : 112} />
            </div>
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          border: '1.5px dashed var(--border-2)', borderRadius: 'var(--radius-xl)',
        }}>
          <div style={{ marginBottom: 16 }}><Grid3x3 size={48} color="var(--text-3)" strokeWidth={1.25} /></div>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>No data yet</div>
          <div style={{ color: 'var(--text-2)', fontSize: 14 }}>Add habits and complete them to see your contribution map.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {habits.map((h, i) => {
            const totalInRange = h.completions.filter(c => {
              const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - range);
              return c.date >= toDateStr(cutoff);
            }).length;

            return (
              <div key={h.id} className="card anim-up" style={{ padding: '20px 24px', animationDelay: `${i * 60}ms`, borderLeft: `4px solid ${h.color}` }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 22 }}>{h.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {h.name}
                      {h.completedToday && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Today</span>}
                    </div>
                    {h.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{h.description}</div>
                    )}
                  </div>
                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                    {[
                      { label: 'streak',  value: h.streak,              color: h.streak > 0 ? h.color : 'var(--text-3)' },
                      { label: 'best',    value: `${h.longestStreak}d`, color: 'var(--text-2)' },
                      { label: `in ${range}d`, value: totalInRange,     color: 'var(--text-2)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18, color, lineHeight: 1 }}>{value}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Heatmap */}
                <HabitHeatmap completions={h.completions.map(c => c.date)} color={h.color} weeks={weeks} />
                <HeatmapLegend color={h.color} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
