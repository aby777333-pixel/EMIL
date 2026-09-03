'use client';

/**
 * EMIL Trade Logo — EMIL three-bar mark + "EMIL TRADE" wordmark.
 * Gold-to-blue gradient shield containing a flying raptor silhouette,
 * paired with two-tone "GIO" (cyan) + "RAPTOR" (light gray) wordmark.
 *
 * Props:
 *  - height: logo height in px (default 32)
 *  - iconOnly: show only the shield + raptor mark
 *  - className: additional CSS classes
 *  - theme: 'dark' | 'light' — controls RAPTOR text color
 */

interface LogoProps {
  height?: number;
  iconOnly?: boolean;
  className?: string;
  theme?: 'dark' | 'light';
}

export default function Logo({
  height = 32,
  iconOnly = false,
  className = '',
  theme = 'dark',
}: LogoProps) {
  const raptorColor = theme === 'dark' ? '#C0C4CC' : '#3A3A3A';
  const gioColor = '#00B4D8';

  // Mark is a 1:1 square so it scales cleanly next to text.
  const markSize = height;

  if (iconOnly) {
    return <Mark size={markSize} className={className} />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ height }}>
      <Mark size={markSize} />
      <div
        className="flex items-baseline"
        style={{ fontFamily: 'var(--font-inter, Inter), sans-serif' }}
      >
        <span
          style={{
            fontSize: height * 0.62,
            fontWeight: 600,
            letterSpacing: '0.01em',
            color: gioColor,
            lineHeight: 1,
          }}
        >
          EMIL
        </span>
        <span
          style={{
            fontSize: height * 0.62,
            fontWeight: 300,
            letterSpacing: '0.14em',
            color: raptorColor,
            lineHeight: 1,
            marginLeft: height * 0.18,
          }}
        >
          TRADE
        </span>
      </div>
    </div>
  );
}

/**
 * EMIL Trade brand mark (public/emil-trade-mark.svg).
 * Transparent PNG so it sits cleanly on both dark and light surfaces.
 */
function Mark({ size, className = '' }: { size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/emil-trade-mark.svg"
      alt="EMIL Trade"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}
