import { ENGINES } from './engines'
import { ATR_PERIOD, MIN_BARS } from './strategies'
import { specChecksum, type EmilStrategySpec } from './spec'

/** Cockpit StrategyBlueprint market values. */
export type BlueprintMarket = 'forex' | 'crypto' | 'metals' | 'energy' | 'indices' | 'equities' | 'multi'

const FIAT = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD', 'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'CNH', 'MXN', 'ZAR', 'TRY', 'PLN', 'INR'])
const CRYPTO = /^(BTC|ETH|SOL|XRP|ADA|DOGE|BNB|LTC|DOT|AVAX|LINK|MATIC|TRX|SHIB|TON|XLM|BCH|ATOM|UNI|NEAR)/
const METALS = /^(XAU|XAG|XPT|XPD|GOLD|SILVER|PLATINUM|PALLADIUM)/
const ENERGY = /^(WTI|BRENT|USOIL|UKOIL|CRUDE|CRUDEOIL|NGAS|NATGAS|XNG|XBR|XTI)/
const INDICES = /^(SPX|SPX500|US500|NAS|NAS100|US100|NDX|US30|DJI|DOW|GER40|DE40|DAX|UK100|FTSE|JP225|NIKKEI|HK50|HSI|FRA40|EU50|AUS200|NIFTY|NIFTY50|BANKNIFTY|SENSEX|VIX)/

function classify(symbol: string): Exclude<BlueprintMarket, 'multi'> {
  const s = symbol.replace(/[^A-Z0-9]/g, '')
  if (METALS.test(s)) return 'metals'
  if (ENERGY.test(s)) return 'energy'
  if (CRYPTO.test(s)) return 'crypto'
  if (INDICES.test(s)) return 'indices'
  if (s.length === 6 && FIAT.has(s.slice(0, 3)) && FIAT.has(s.slice(3))) return 'forex'
  return 'equities'
}

export function inferMarket(symbols: readonly string[]): BlueprintMarket {
  const markets = new Set(symbols.map(classify))
  return markets.size === 1 ? Array.from(markets)[0] : 'multi'
}

/**
 * The spec as the Cockpit's StrategyBlueprint fields. Every rule is complete
 * — nothing is missing for the Lab to test — because the engine defines it.
 */
export function toBlueprintFields(spec: EmilStrategySpec) {
  const engine = ENGINES[spec.engine]
  const rules = engine.rules(spec.params)
  const directionNote =
    spec.risk.direction === 'long' ? 'Long trades only; short signals are ignored.' : spec.risk.direction === 'short' ? 'Short trades only; long signals are ignored.' : 'Trades both directions.'
  return {
    name: spec.name,
    market: inferMarket(spec.symbols),
    instruments: spec.symbols.join(', '),
    timeframe: spec.timeframe,
    indicators: [...engine.indicators(spec.params), `ATR(${ATR_PERIOD})`],
    entryLong: `On each closed ${spec.timeframe} bar: ${rules.long} A position opens only when the regime changes, closing an opposite position first.`,
    entryShort: `On each closed ${spec.timeframe} bar: ${rules.short} A position opens only when the regime changes, closing an opposite position first.`,
    stopLoss: `${spec.risk.slAtrMult} × ATR(${ATR_PERIOD}) from the fill price.`,
    takeProfit: `${spec.risk.tpAtrMult} × ATR(${ATR_PERIOD}) from the fill price.`,
    positionSizing: `Fixed ${spec.risk.lot} lot per entry; one position at a time.`,
    filters: `${directionNote} No evaluation until ${MIN_BARS} bars have closed.`,
    invalidConditions: 'After a stop-loss or take-profit, no new entry until the regime changes. Disarmed by the kill switch or when a risk limit is breached.',
    engine: { id: spec.engine, label: engine.label, family: engine.family, params: spec.params },
    checksum: specChecksum(spec),
  }
}

/** Readable pseudocode of what the strategy does. */
export function toPseudocode(spec: EmilStrategySpec): string {
  const engine = ENGINES[spec.engine]
  const rules = engine.rules(spec.params)
  const dir = spec.risk.direction === 'both' ? 'LONG AND SHORT' : spec.risk.direction === 'long' ? 'LONG ONLY' : 'SHORT ONLY'
  return [
    `STRATEGY "${spec.name}"   (${engine.label}, v${spec.version})`,
    `  SYMBOLS      ${spec.symbols.join(', ')}`,
    `  TIMEFRAME    ${spec.timeframe}`,
    `  INDICATORS   ${engine.indicators(spec.params).join(', ')}, ATR(${ATR_PERIOD})`,
    `  DIRECTION    ${dir}`,
    '',
    `  ON each closed bar (after ${MIN_BARS} bars):`,
    `    LONG REGIME  WHEN ${rules.long}`,
    `    SHORT REGIME WHEN ${rules.short}`,
    '',
    '    IF regime changed since the last trade AND direction allows it:',
    '      CLOSE any opposite position',
    `      OPEN ${spec.risk.lot} lot at market`,
    `      STOP   = fill ∓ ${spec.risk.slAtrMult} × ATR(${ATR_PERIOD})`,
    `      TARGET = fill ± ${spec.risk.tpAtrMult} × ATR(${ATR_PERIOD})`,
    '',
    '  AFTER a stop or target: wait for the regime to change.',
    '  ALWAYS: kill switch and risk limits override the strategy.',
  ].join('\n')
}
