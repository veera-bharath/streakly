import { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 'var(--radius)', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, flexShrink: 0, ...style }}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card" style={{ gap: 14 }}>
      <Skeleton width={40} height={40} borderRadius={10} />
      <Skeleton width={60} height={28} />
      <Skeleton width={80} height={12} />
    </div>
  );
}

export function HabitCardSkeleton() {
  return (
    <div className="card" style={{ padding: '20px 22px', borderLeft: '4px solid var(--border-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <Skeleton width={36} height={36} borderRadius="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Skeleton width="45%" height={15} />
          <Skeleton width="30%" height={11} />
        </div>
        <Skeleton width={40} height={32} />
      </div>
      <Skeleton height={72} style={{ marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 16 }}>
        <Skeleton width={60} height={11} />
        <Skeleton width={60} height={11} />
        <div style={{ flex: 1 }} />
        <Skeleton width={120} height={32} borderRadius="var(--radius)" />
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 8px' }}>
      {[65, 80, 45, 90, 70, 55, 85].map((h, i) => (
        <Skeleton key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0', animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}
