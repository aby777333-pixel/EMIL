'use client';

import { Zap, Layers, Copy, ShieldCheck, Headset } from 'lucide-react';

/**
 * AuthBrandPanel — right pane of AuthShell. Replaces the old market ticker with
 * a brand image + headline + GIO4X feature highlights. Purely presentational.
 */

const FEATURES = [
  { icon: Zap, title: 'Spreads from 0.0 pips', desc: 'Raw ECN pricing — no dealing-desk markup.' },
  { icon: Layers, title: 'Leverage up to 1:1000', desc: 'Flexible margin across FX, metals, indices & crypto.' },
  { icon: Copy, title: 'Copy, PAMM & MAM', desc: 'Mirror top traders or allocate to professional managers.' },
  { icon: ShieldCheck, title: 'Your funds stay yours', desc: 'Segregated accounts with negative-balance protection.' },
  { icon: Headset, title: '24/5 human support', desc: 'Real people who measure trust in years, not minutes.' },
];

export default function AuthBrandPanel() {
  return (
    <div className="absolute inset-0">
      {/* Brand image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/auth-brand.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: 0.5 }}
      />
      {/* Dark scrim for text readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, rgba(8,10,14,0.92) 0%, rgba(8,10,14,0.72) 44%, rgba(8,10,14,0.90) 100%)',
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-center px-12 xl:px-16">
        <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--g-accent)' }}>
          The Gentleman&apos;s Forex Broker
        </div>
        <h2 className="mt-3 text-[34px] font-light leading-tight" style={{ color: 'var(--g-text-primary)' }}>
          The desk is open.
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--g-text-secondary)' }}>
          Sub-millisecond execution. Multi-asset coverage. Built for traders who measure
          slippage in pips and partners who measure trust in years.
        </p>

        <ul className="mt-9 max-w-md space-y-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="flex items-start gap-3.5">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'var(--g-accent)',
                    border: '1px solid var(--g-border-hair)',
                  }}
                >
                  <Icon size={15} strokeWidth={1.8} />
                </span>
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--g-text-primary)' }}>
                    {f.title}
                  </div>
                  <div className="mt-0.5 text-[11px]" style={{ color: 'var(--g-text-muted)' }}>
                    {f.desc}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
