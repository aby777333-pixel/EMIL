// ═══════════════════════════════════════════════════════════════
// NEXUS market-data bridge. The terminal page owns the OHLCVBuilder (real
// bars); NEXUS lives globally. The terminal registers its builder here so
// NEXUS can compute a real market-state classification when the trader is on
// the terminal — and honestly omit it everywhere else.
// ═══════════════════════════════════════════════════════════════

import type { OHLCVBuilder } from '@/lib/trading/ohlcv-builder';

let builder: OHLCVBuilder | null = null;

export function registerOhlcvBuilder(b: OHLCVBuilder | null): void {
  builder = b;
}

export function getOhlcvBuilder(): OHLCVBuilder | null {
  return builder;
}
