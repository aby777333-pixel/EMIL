'use client';

import { cn } from '@/lib/utils/format';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function SkeletonBase({ className, width, height, ...rest }: { className?: string; width?: string | number; height?: string | number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('animate-pulse rounded bg-white/[0.04]', className)}
      style={{ width, height }}
    />
  );
}

export function Skeleton({ className, variant = 'rectangular', width, height, lines = 1 }: SkeletonProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            className={cn('h-3 rounded', i === lines - 1 ? 'w-3/4' : 'w-full', className)}
          />
        ))}
      </div>
    );
  }

  if (variant === 'circular') {
    return <SkeletonBase className={cn('rounded-full', className)} width={width ?? 40} height={height ?? 40} />;
  }

  if (variant === 'card') {
    return (
      <div className={cn('bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-3', className)}>
        <div className="flex items-center gap-3">
          <SkeletonBase className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBase className="h-3 w-1/3" />
            <SkeletonBase className="h-2 w-1/2" />
          </div>
        </div>
        <SkeletonBase className="h-2 w-full" />
        <SkeletonBase className="h-2 w-4/5" />
        <div className="flex gap-2 pt-1">
          <SkeletonBase className="h-6 w-16 rounded-md" />
          <SkeletonBase className="h-6 w-16 rounded-md" />
        </div>
      </div>
    );
  }

  return <SkeletonBase className={className} width={width} height={height ?? 16} />;
}

/**
 * Table skeleton — shows loading state for data tables
 */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-5 py-3 border-b border-white/[0.06]">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBase key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-3 border-b border-white/[0.03]">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBase key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Chart skeleton — placeholder for chart loading
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden" style={{ height }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <SkeletonBase className="h-3 w-32" />
        <div className="flex gap-2">
          <SkeletonBase className="h-6 w-12 rounded-md" />
          <SkeletonBase className="h-6 w-12 rounded-md" />
        </div>
      </div>
      <div className="p-4 flex items-end gap-[2px]" style={{ height: height - 52 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <SkeletonBase key={i} className="flex-1 rounded-t-sm" style={{ height: `${20 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * KPI grid skeleton
 */
export function KpiSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-2">
          <SkeletonBase className="h-3 w-20" />
          <SkeletonBase className="h-6 w-24" />
          <SkeletonBase className="h-2 w-16" />
        </div>
      ))}
    </div>
  );
}
