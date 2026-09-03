'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/format';
import { MiniSparkline } from '@/components/charts/MiniSparkline';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  sparklineData?: number[];
}

export function KpiCard({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  sparklineData,
}: KpiCardProps) {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = change !== undefined
    ? isPositive ? 'text-profit' : 'text-loss'
    : '';

  return (
    <div className="stat-card flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Icon className="h-4 w-4 text-accent" />
          </div>
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <MiniSparkline
            data={sparklineData}
            width={80}
            height={32}
            color={isPositive ? 'var(--profit)' : 'var(--loss)'}
          />
        )}
      </div>

      <p className="text-xs text-secondary">{label}</p>

      <p className="mono text-2xl font-semibold text-foreground">{value}</p>

      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className={cn('mono text-sm font-medium', changeColor)}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-muted">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
