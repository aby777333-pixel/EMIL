'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import AuthBrandPanel from './AuthBrandPanel';

/**
 * AuthShell — split-screen layout used by every page in /auth/*.
 *
 * Left:  480px form panel (form lives in `children`)
 * Right: ambient market ticker (hidden on small screens)
 *
 * Wrapped in `.gentleman` so it picks up the institutional crimson palette
 * defined in globals.css without affecting the trading platform or dealer.
 */
export default function AuthShell({
  children,
  accent = 'crimson',
  legalLine,
}: {
  children: React.ReactNode;
  /** crimson = trader/default, gold = broker B2B */
  accent?: 'crimson' | 'gold';
  /** override the bottom-of-pane risk-warning line */
  legalLine?: string;
}) {
  // Override accent custom-properties on the wrapper element itself so the
  // gold variant only affects this subtree — no global side effects.
  const accentStyle =
    accent === 'gold'
      ? ({
          ['--g-accent' as string]: '#F0A500',
          ['--g-accent-glow' as string]: '#FFB733',
          ['--g-accent-deep' as string]: '#C28000',
        } as React.CSSProperties)
      : undefined;

  return (
    <div
      className="gentleman min-h-screen w-full grid grid-cols-1 lg:grid-cols-[480px_1fr]"
      style={accentStyle}
    >

      {/* ── Left: form panel ── */}
      <section className="relative flex flex-col px-8 py-8 lg:px-12 lg:py-10">
        <header className="flex items-center justify-between mb-10">
          <Link href="/" aria-label="EMIL TRADE home" className="flex items-center">
            <Logo height={28} theme="dark" />
          </Link>
          <span
            className="text-[10px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--g-text-muted)' }}
          >
            Secure client area
          </span>
        </header>

        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto g-fade-in">
          {children}
        </div>

        <footer
          className="pt-8 mt-8 border-t text-[11px] leading-relaxed"
          style={{
            borderColor: 'var(--g-border-hair)',
            color: 'var(--g-text-muted)',
          }}
        >
          {legalLine ??
            'Trading leveraged products carries substantial risk. Past performance is not indicative of future results.'}{' '}
          <span className="block mt-1 opacity-70">© {new Date().getFullYear()} EMIL TRADE</span>
        </footer>
      </section>

      {/* ── Right: ambient market drift ── */}
      <aside
        className="hidden lg:block relative overflow-hidden border-l"
        style={{
          background:
            'radial-gradient(ellipse at top right, rgba(255,255,255,0.025) 0%, transparent 60%), var(--g-bg-void)',
          borderColor: 'var(--g-border-hair)',
        }}
      >
        <AuthBrandPanel />
      </aside>
    </div>
  );
}
