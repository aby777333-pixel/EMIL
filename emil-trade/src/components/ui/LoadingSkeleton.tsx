import { cn } from '@/lib/utils/format';

type SkeletonVariant = 'card' | 'table' | 'text' | 'chart';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
}

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-surface',
        className,
      )}
      style={style}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="stat-card flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bone className="h-8 w-8 rounded-lg" />
        <Bone className="h-3 w-20" />
      </div>
      <Bone className="h-7 w-28" />
      <Bone className="h-3 w-16" />
    </div>
  );
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-elevated">
      {/* Header */}
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {[100, 80, 120, 60, 80].map((w, i) => (
          <Bone key={i} className="h-3" style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-border px-4 py-3 last:border-0">
          {[100, 80, 120, 60, 80].map((w, i) => (
            <Bone key={i} className="h-3" style={{ width: w + Math.random() * 20 - 10 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TextSkeleton({ lines }: { lines: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Bone
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-28" />
        <Bone className="h-4 w-20" />
      </div>
      <Bone className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function LoadingSkeleton({ variant = 'card', count = 1 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count });

  switch (variant) {
    case 'card':
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((_, i) => <CardSkeleton key={i} />)}
        </div>
      );
    case 'table':
      return <TableSkeleton rows={count} />;
    case 'text':
      return <TextSkeleton lines={count} />;
    case 'chart':
      return (
        <div className="grid gap-4">
          {items.map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      );
  }
}
