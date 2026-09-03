// ═══════════════════════════════════════════════════════════════
// EMIL TRADE — Stop-Out Monitor
//
// Checks margin levels for all accounts and triggers forced
// closure of positions when margin_level < stop_out_level.
//
// Priority: close the position with the largest floating loss first.
// ═══════════════════════════════════════════════════════════════

import { calculateMarginLevel } from './margin-calculator';

export interface AccountMarginState {
  accountId: string;
  userId: string;
  equity: number;
  margin: number;
  marginLevel: number;        // as percentage (e.g., 150.00)
  marginCallLevel: number;    // bps → percentage (e.g., 8000 → 80%)
  stopOutLevel: number;       // bps → percentage (e.g., 5000 → 50%)
  positions: PositionState[];
}

export interface PositionState {
  id: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  size: number;
  floatingPnl: number;
  marginUsed: number;
}

export type StopOutAction =
  | { type: 'margin_call'; accountId: string; userId: string; marginLevel: number }
  | { type: 'stop_out'; accountId: string; userId: string; positionId: string; symbol: string; marginLevel: number }
  | { type: 'ok'; accountId: string };

/**
 * Evaluate a single account's margin state and determine actions.
 */
export function evaluateAccount(state: AccountMarginState): StopOutAction[] {
  const actions: StopOutAction[] = [];
  const mcLevel = state.marginCallLevel / 100; // bps to %
  const soLevel = state.stopOutLevel / 100;    // bps to %

  // No open positions = no risk
  if (state.positions.length === 0 || state.margin <= 0) {
    return [{ type: 'ok', accountId: state.accountId }];
  }

  const currentLevel = calculateMarginLevel(state.equity, state.margin);

  // Check margin call (warning level)
  if (currentLevel < mcLevel && currentLevel >= soLevel) {
    actions.push({
      type: 'margin_call',
      accountId: state.accountId,
      userId: state.userId,
      marginLevel: currentLevel,
    });
  }

  // Check stop-out (force close level)
  if (currentLevel < soLevel) {
    // Find the position with the worst floating P&L (most negative first)
    const sorted = [...state.positions].sort((a, b) => a.floatingPnl - b.floatingPnl);
    const worstPosition = sorted[0];

    if (worstPosition) {
      actions.push({
        type: 'stop_out',
        accountId: state.accountId,
        userId: state.userId,
        positionId: worstPosition.id,
        symbol: worstPosition.symbol,
        marginLevel: currentLevel,
      });
    }
  }

  if (actions.length === 0) {
    actions.push({ type: 'ok', accountId: state.accountId });
  }

  return actions;
}

/**
 * Batch evaluation of multiple accounts.
 * Returns only accounts that need action (margin_call or stop_out).
 */
export function evaluateAllAccounts(accounts: AccountMarginState[]): StopOutAction[] {
  const allActions: StopOutAction[] = [];

  for (const account of accounts) {
    const actions = evaluateAccount(account);
    for (const action of actions) {
      if (action.type !== 'ok') {
        allActions.push(action);
      }
    }
  }

  return allActions;
}

/**
 * Get margin level severity classification.
 */
export function getMarginSeverity(marginLevel: number): 'safe' | 'warning' | 'danger' | 'critical' {
  if (marginLevel >= 200) return 'safe';
  if (marginLevel >= 100) return 'warning';
  if (marginLevel >= 50) return 'danger';
  return 'critical';
}

/**
 * Get margin level color for UI.
 */
export function getMarginLevelColor(marginLevel: number): string {
  const severity = getMarginSeverity(marginLevel);
  switch (severity) {
    case 'safe':     return '#00C896'; // green
    case 'warning':  return '#FFB800'; // amber
    case 'danger':   return '#FF6B35'; // orange
    case 'critical': return '#FF4444'; // red
  }
}
