'use client';

import { ButtonHTMLAttributes } from 'react';

/**
 * Primary auth submit button. Loading state replaces the label with a
 * monospace dot ticker — no spinner so the layout doesn't reflow.
 */
export function PrimaryButton({
  loading,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || rest.disabled}
      className={`g-btn-primary ${className ?? ''}`}
      {...rest}
    >
      {loading ? <Dots /> : children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`g-btn-secondary ${className ?? ''}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Animated three-dot ticker used inside loading buttons. Pure CSS,
 * monospace cells so width is stable.
 */
function Dots() {
  return (
    <span className="num inline-flex gap-1.5 align-middle" aria-label="Loading">
      <Dot delay={0} />
      <Dot delay={140} />
      <Dot delay={280} />
    </span>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block"
      style={{
        width: 5,
        height: 5,
        borderRadius: 5,
        background: 'currentColor',
        opacity: 0.55,
        animation: `g-dot 900ms ease-in-out ${delay}ms infinite`,
      }}
    >
      <style>{`
        @keyframes g-dot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>
    </span>
  );
}

/**
 * Outlined Google OAuth button. Vendor mark drawn inline so we don't
 * pull a new icon dep just for one glyph.
 */
export function GoogleOAuthButton({
  onClick,
  loading,
  children = 'Continue with Google',
}: {
  onClick: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="g-btn-secondary flex items-center justify-center gap-3"
      aria-label="Sign in with Google"
    >
      <GoogleGlyph />
      <span className="text-sm">{loading ? <Dots /> : children}</span>
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.45.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}
