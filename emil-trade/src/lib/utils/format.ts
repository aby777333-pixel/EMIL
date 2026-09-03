// ═══════════════════════════════════════════════════════════
// EMIL TRADE — Formatting Utilities
// All numbers localized, all currency with symbols,
// all dates timezone-aware, all P&L color-coded
// ═══════════════════════════════════════════════════════════

/**
 * Format price with correct decimal places based on instrument
 */
export function formatPrice(price: number, decimals: number = 5): string {
  return price.toFixed(decimals);
}

/**
 * Format P&L with sign prefix
 */
export function formatPnL(pnl: number, decimals: number = 2): string {
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${pnl.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/**
 * Format lot size
 */
export function formatLot(lot: number): string {
  return lot.toFixed(2);
}

/**
 * Format percentage with sign
 */
export function formatPercent(pct: number, decimals: number = 2): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(decimals)}%`;
}

/**
 * Format currency with proper locale symbol and separators
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompact(n: number, decimals: number = 1): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(decimals)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toLocaleString('en-US');
}

/**
 * Format large currency values with compact notation
 */
export function formatCurrencyCompact(amount: number, currency: string = 'USD'): string {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  if (Math.abs(amount) >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
  if (Math.abs(amount) >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Format number with locale-aware separators
 */
export function formatNumber(n: number, decimals?: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Calculate spread in pips
 */
export function getSpreadPips(bid: number, ask: number, pricescale: number): number {
  return (ask - bid) * pricescale / 10;
}

/**
 * Format date as relative time (2h ago, 3d ago)
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Format date with user's local timezone, ISO tooltip value
 */
export function formatDateTime(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    ...options,
  });
}

/**
 * Format date only
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time only with seconds
 */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format duration from milliseconds
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Get P&L color class
 */
export function pnlColor(value: number): string {
  if (value > 0) return 'text-[#00dc82]';
  if (value < 0) return 'text-[#ef4444]';
  return 'text-white/40';
}

/**
 * Get P&L background color class
 */
export function pnlBgColor(value: number): string {
  if (value > 0) return 'bg-[#00dc82]/10';
  if (value < 0) return 'bg-[#ef4444]/10';
  return 'bg-white/5';
}

/**
 * Utility: join class names, filtering falsy values
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
