import { cn } from '@/lib/utils/format';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
}

const STATUS_MAP: Record<string, BadgeVariant> = {
  operational: 'success',
  active: 'success',
  filled: 'success',
  approved: 'success',
  connected: 'success',
  profit: 'success',
  pending: 'warning',
  partial: 'warning',
  processing: 'warning',
  suspended: 'warning',
  open: 'info',
  new: 'info',
  running: 'info',
  queued: 'info',
  rejected: 'danger',
  failed: 'danger',
  error: 'danger',
  stopped: 'danger',
  loss: 'danger',
  closed: 'default',
  inactive: 'default',
  cancelled: 'default',
};

const VARIANT_STYLES: Record<BadgeVariant, { dot: string; text: string; bg: string }> = {
  default:  { dot: 'bg-secondary',          text: 'text-secondary',          bg: 'bg-secondary/10' },
  success:  { dot: 'bg-profit',             text: 'text-profit',             bg: 'bg-profit/10' },
  warning:  { dot: 'bg-gold',               text: 'text-gold',               bg: 'bg-gold/10' },
  danger:   { dot: 'bg-loss',               text: 'text-loss',               bg: 'bg-loss/10' },
  info:     { dot: 'bg-accent',             text: 'text-accent',             bg: 'bg-accent/10' },
};

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const resolved = variant ?? STATUS_MAP[status.toLowerCase()] ?? 'default';
  const styles = VARIANT_STYLES[resolved];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles.bg,
        styles.text,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
      {status}
    </span>
  );
}
