import { useState } from 'react';

interface TooltipState {
  date: string;
  completed: boolean;
  x: number;
  y: number;
}

interface Props {
  completions: string[];
  color: string;
  weeks?: number;
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatDate(str: string): string {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// 5-level intensity (GitHub style) — for binary habit data level 1 = done, 0 = not done
// but we vary the shade so the grid looks rich
function cellFill(done: boolean, color: string): string {
  return done ? color : 'var(--surface-2)';
}

export function MiniHeatmap({ completions, color, weeks = 16 }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const set = new Set(completions);

  const CELL = 12;
  const GAP  = 3;

  const today = new Date();
  const todayDow = today.getDay() || 7; // 1=Mon..7=Sun
  const totalDays = weeks * 7;

  const days: (string | null)[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(toDateStr(d));
  }
  // Pad right so last column ends today (Mon-aligned)
  const endPad = 7 - todayDow;
  for (let i = 0; i < endPad; i++) days.push(null);

  const cols: (string | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  const svgW = cols.length * (CELL + GAP) - GAP;
  const svgH = 7 * (CELL + GAP) - GAP;

  const handleMouseEnter = (e: React.MouseEvent<SVGRectElement>, date: string, done: boolean) => {
    const r = (e.target as SVGRectElement).getBoundingClientRect();
    setTooltip({ date, completed: done, x: r.left + r.width / 2, y: r.top });
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg width={svgW} height={svgH} style={{ display: 'block', overflow: 'visible' }}>
        {cols.map((col, ci) =>
          col.map((date, ri) => {
            if (!date) return null;
            const done = set.has(date);
            return (
              <rect
                key={`${ci}-${ri}`}
                x={ci * (CELL + GAP)}
                y={ri * (CELL + GAP)}
                width={CELL} height={CELL} rx={2}
                fill={cellFill(done, color)}
                opacity={date > toDateStr(today) ? 0 : done ? 1 : 0.55}
                style={{ cursor: 'pointer', transition: 'opacity .1s' }}
                onMouseEnter={e => handleMouseEnter(e, date, done)}
                onMouseLeave={() => setTooltip(null)}
              />
            );
          })
        )}
      </svg>

      {tooltip && (
        <div
          className="tooltip-box"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span style={{ opacity: .7 }}>{formatDate(tooltip.date)}</span>
          {'  '}
          <span style={{ color: tooltip.completed ? '#4ade80' : '#f87171' }}>
            {tooltip.completed ? '✓ Done' : '✗ Missed'}
          </span>
        </div>
      )}
    </div>
  );
}
