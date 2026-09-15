/**
 * EMIL Strategy Kit — the one definition of a strategy shared by the EMIL
 * Strategy Builder, EMIL Trade and the EMIL Cockpit.
 *
 * This folder is the source of truth. EMIL Trade and the Cockpit carry a copy
 * (see README.md for where, and how to keep them in step); bump KIT_VERSION
 * whenever the copies must be refreshed.
 */
export const KIT_VERSION = '1.0.0'

export * from './engines'
export * from './spec'
export { evaluateRegime, backtest, MIN_BARS, ATR_PERIOD, type Bar, type Regime, type BacktestResult, type BacktestTrade } from './strategies'
export { generateMql5 } from './codegen/mql5'
export { generatePine } from './codegen/pine'
export { fileBaseName } from './codegen/shared'
export { toBlueprintFields, toPseudocode, inferMarket, type BlueprintMarket } from './describe'
