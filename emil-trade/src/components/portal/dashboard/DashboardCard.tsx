'use client';

/**
 * Generic surface used by every dashboard tile. Hairline border,
 * inset highlight, subtle hover brightness — no transforms (per spec
 * the canvas must not bounce).
 */
export default function DashboardCard({
  title,
  trailing,
  children,
  padding = 'lg',
  className,
}: {
  title?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  padding?: 'sm' | 'lg' | 'none';
  className?: string;
}) {
  const pad = padding === 'none' ? '0' : padding === 'sm' ? '12px 14px' : '18px 20px';

  return (
    <section
      className={className ?? ''}
      style={{
        background: 'var(--g-bg-surface)',
        border: '1px solid var(--g-border-hair)',
        borderRadius: 12,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {(title || trailing) && (
        <header
          className="flex items-center justify-between"
          style={{
            padding: padding === 'none' ? '14px 20px' : pad,
            paddingBottom: padding === 'none' ? '14px 20px' : 0,
          }}
        >
          {title && (
            <h2
              className="text-[11px] uppercase tracking-[0.14em] font-medium m-0"
              style={{ color: 'var(--g-text-secondary)' }}
            >
              {title}
            </h2>
          )}
          {trailing}
        </header>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );
}
