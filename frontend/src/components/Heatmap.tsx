import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { HeatmapCell } from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function intensityColor(intensity: number, completed: number): string {
  if (completed === 0) return '#1a1a1a';
  if (intensity < 0.25) return '#713f12';
  if (intensity < 0.5) return '#92400e';
  if (intensity < 0.75) return '#b45309';
  return '#f59e0b';
}

export function Heatmap() {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [tooltip, setTooltip] = useState<{ cell: HeatmapCell; x: number; y: number } | null>(null);

  useEffect(() => {
    api.analytics.heatmap().then(setCells).catch(console.error);
  }, []);

  if (cells.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        Loading heatmap...
      </div>
    );
  }

  // Group into weeks (columns of 7 days each)
  const CELL = 13;
  const GAP = 3;

  // Build week columns
  const firstDate = new Date(cells[0].date);
  const startDow = firstDate.getDay() || 7; // 1=Mon..7=Sun
  const padded: (HeatmapCell | null)[] = [
    ...Array(startDow - 1).fill(null),
    ...cells,
  ];
  const weeks: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  // Month labels
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstReal = week.find(c => c !== null);
    if (firstReal) {
      const m = new Date(firstReal.date).getMonth();
      if (m !== lastMonth) { monthLabels.push({ label: MONTHS[m], col: wi }); lastMonth = m; }
    }
  });

  const svgWidth = weeks.length * (CELL + GAP) + 28;
  const svgHeight = 7 * (CELL + GAP) + 28;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <svg width={svgWidth} height={svgHeight} style={{ display: 'block' }}>
          {/* Day labels */}
          {DAYS.map((d, i) => (
            <text key={i} x={0} y={24 + i * (CELL + GAP)} fontSize={9} fill="var(--text-3)" fontFamily="var(--font-mono)"
              dominantBaseline="middle">
              {d}
            </text>
          ))}

          {/* Month labels */}
          {monthLabels.map(({ label, col }) => (
            <text key={`${label}-${col}`} x={28 + col * (CELL + GAP)} y={10} fontSize={9} fill="var(--text-3)" fontFamily="var(--font-mono)">
              {label}
            </text>
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((cell, di) => {
              if (!cell) return null;
              const x = 28 + wi * (CELL + GAP);
              const y = 16 + di * (CELL + GAP);
              const color = intensityColor(cell.intensity, cell.completed);
              return (
                <rect
                  key={cell.date}
                  x={x} y={y}
                  width={CELL} height={CELL}
                  rx={2} ry={2}
                  fill={color}
                  style={{ cursor: 'pointer', transition: 'opacity 0.1s' }}
                  onMouseEnter={e => {
                    const rect = (e.target as SVGRectElement).getBoundingClientRect();
                    setTooltip({ cell, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Less</span>
        {['#1a1a1a', '#713f12', '#92400e', '#b45309', '#f59e0b'].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y - 8,
          transform: 'translate(-50%, -100%)',
          background: '#1a1a1a',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--radius)',
          padding: '6px 10px',
          fontSize: 12,
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none',
          zIndex: 50,
          whiteSpace: 'nowrap',
        }}>
          <div style={{ color: 'var(--text)' }}>{tooltip.cell.date}</div>
          <div style={{ color: 'var(--amber)' }}>
            {tooltip.cell.completed}/{tooltip.cell.total} habits
          </div>
        </div>
      )}
    </div>
  );
}
