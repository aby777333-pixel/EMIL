import { cn } from '@/lib/utils/format';

type ProgressSize = 'sm' | 'md' | 'lg';

interface ProgressBarProps {
  value: number;
  label?: string;
  color?: string;
  animated?: boolean;
  size?: ProgressSize;
}

const HEIGHT: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  label,
  color,
  animated = false,
  size = 'md',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-secondary">{label}</span>
          <span className="mono text-foreground">{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-surface', HEIGHT[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            animated && 'animate-pulse',
          )}
          style={{
            width: `${clamped}%`,
            backgroundColor: color ?? 'var(--accent)',
          }}
        />
      </div>
    </div>
  );
}
