// Shared header button theme: every control in the chart header gets its own
// hue. Resting state is a dull, low-saturation tint; the active/open state
// lights up bright with a soft outer glow + inset top highlight — a "3D
// glowing switch" look. Centralised here so every menu stays consistent and
// the resting/active pair never causes a layout shift (border set in both).

import type { CSSProperties } from 'react';

export type HeaderHueKey =
  | 'source' | 'trade' | 'templates' | 'watchlist' | 'alerts' | 'markets'
  | 'insights' | 'risk' | 'journal' | 'dom' | 'script' | 'eas' | 'tf' | 'protect';

// hex = bright active color · rgb = same color as "r,g,b" for rgba() mixes
const HUES: Record<HeaderHueKey, { hex: string; rgb: string }> = {
  source:    { hex: '#29ABE2', rgb: '41,171,226' },  // chart-source tabs — brand blue
  trade:     { hex: '#00B4D8', rgb: '0,180,216' },   // QuickTrade — cyan
  templates: { hex: '#AB47BC', rgb: '171,71,188' },  // Templates — purple
  watchlist: { hex: '#00BFA5', rgb: '0,191,165' },   // Watchlist — teal
  alerts:    { hex: '#FFB300', rgb: '255,179,0' },   // Alerts — amber
  markets:   { hex: '#FF7043', rgb: '255,112,67' },  // Markets — orange
  insights:  { hex: '#7C6FFF', rgb: '124,111,255' }, // Insights — violet
  risk:      { hex: '#FF5252', rgb: '255,82,82' },   // Risk — red
  journal:   { hex: '#EC407A', rgb: '236,64,122' },  // Journal — pink
  dom:       { hex: '#9CCC65', rgb: '156,204,101' }, // DOM — lime
  script:    { hex: '#5C8AFF', rgb: '92,138,255' },  // Raptor Script — indigo
  eas:       { hex: '#00C27A', rgb: '0,194,122' },   // EAs / Robots — green
  tf:        { hex: '#29ABE2', rgb: '41,171,226' },  // timeframe pills — brand blue
  protect:   { hex: '#00E5A0', rgb: '0,229,160' },   // Shield / protection — mint
};

/** Style for a header trigger button. Dull tint at rest; bright glow when
 *  active/open. Border exists in both states so toggling never shifts layout. */
export function headerBtnStyle(key: HeaderHueKey, active: boolean): CSSProperties {
  const h = HUES[key];
  if (!active) {
    return {
      backgroundColor: `rgba(${h.rgb},0.07)`,
      color: `rgba(${h.rgb},0.60)`,
      border: `1px solid rgba(${h.rgb},0.16)`,
      boxShadow: 'none',
      textShadow: 'none',
    };
  }
  return {
    background: `linear-gradient(180deg, rgba(${h.rgb},0.32) 0%, rgba(${h.rgb},0.10) 100%)`,
    color: h.hex,
    border: `1px solid rgba(${h.rgb},0.75)`,
    boxShadow: `0 0 12px rgba(${h.rgb},0.45), 0 0 3px rgba(${h.rgb},0.55), inset 0 1px 0 rgba(255,255,255,0.22)`,
    textShadow: `0 0 8px rgba(${h.rgb},0.85)`,
  };
}

/** Glow-only accent (no background/border overrides) for controls that keep
 *  their own colors — e.g. the green/red Algo switch. */
export function glowStyle(rgb: string): CSSProperties {
  return {
    boxShadow: `0 0 12px rgba(${rgb},0.5), 0 0 3px rgba(${rgb},0.6), inset 0 1px 0 rgba(255,255,255,0.2)`,
    textShadow: `0 0 8px rgba(${rgb},0.9)`,
  };
}
