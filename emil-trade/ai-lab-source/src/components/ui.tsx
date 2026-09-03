import React from 'react';

export function Card({
  className = '',
  children,
  glow = false,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`glass p-4 ${glow ? 'shadow-neon border-primary/40' : ''} ${
        onClick ? 'cursor-pointer glass-hover' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  idle: 'text-subtext bg-subtext/10 border-subtext/30',
  running: 'text-primary bg-primary/10 border-primary/40',
  complete: 'text-success bg-success/10 border-success/40',
  error: 'text-danger bg-danger/10 border-danger/40',
  PENDING: 'text-warning bg-warning/10 border-warning/40',
  APPROVED: 'text-success bg-success/10 border-success/40',
  PAPER: 'text-primary bg-primary/10 border-primary/40',
  LIVE: 'text-success bg-success/10 border-success/40',
  REJECTED: 'text-danger bg-danger/10 border-danger/40',
};

export function Badge({
  children,
  status,
  className = '',
}: {
  children: React.ReactNode;
  status?: string;
  className?: string;
}) {
  const color = status ? STATUS_COLORS[status] || STATUS_COLORS.idle : '';
  return <span className={`badge border ${color} ${className}`}>{children}</span>;
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: 'bg-subtext',
    running: 'bg-primary animate-pulse shadow-neon',
    complete: 'bg-success',
    error: 'bg-danger',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status] || 'bg-subtext'}`} />;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

export function ConfidenceBar({ value, color = '#00d4ff' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value * (value <= 1 ? 100 : 1)));
  return (
    <div className="w-full h-1.5 rounded-full bg-bg overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
      />
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-subtext">{children}</h3>
      {right}
    </div>
  );
}

export function EmptyState({ icon, title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="text-4xl mb-3 opacity-60">{icon}</div>}
      <div className="text-text font-semibold">{title}</div>
      {sub && <div className="text-subtext text-sm mt-1 max-w-md">{sub}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
  title,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`glass w-full ${wide ? 'max-w-5xl' : 'max-w-lg'} max-h-[90vh] overflow-auto shadow-neon`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card/90 backdrop-blur-md z-10">
            <div className="text-lg font-bold">{title}</div>
            <button onClick={onClose} className="text-subtext hover:text-danger text-xl leading-none">
              ✕
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function fmtMoney(n?: number, digits = 2): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(n?: number): string {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function pnlColor(n?: number): string {
  if (n == null) return 'text-subtext';
  return n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-subtext';
}
