// ═══════════════════════════════════════════════════════════════
// EMIL Strategy Builder → EMIL Trade
//
// A strategy built in the EMIL Strategy Builder arrives as an EMIL Strategy
// Spec in the URL fragment (#emil-strategy=…). It is held for the tab in
// sessionStorage (so it survives the sign-in redirect), validated with the
// shared kit, confirmed by the trader, and added to the custom EA library:
//   - same engine (strategyKind), so the runtime evaluates exactly the rule
//     that was built and backtested;
//   - the spec's inputs saved as EA input overrides, which effectiveEngineParams
//     feeds to the engine;
//   - lot, ATR stop and target and direction saved as the EA's Properties, which
//     the runtime applies when the EA is attached.
// Attaching still goes through the per-EA risk disclaimer.
// ═══════════════════════════════════════════════════════════════

import {
  checksumOf,
  loadCustomEAs,
  removeCustomEA,
  saveCustomEA,
  saveInputOverrides,
  type CustomEA,
  type ExtractedInput,
} from '@/lib/trading/custom-ea';
import { STRATEGY_INPUT_DECLS } from '@/lib/trading/ea-params';
import { DEFAULT_FULL_SETTINGS, type EAFullSettings } from '@/components/trading/chart/EAPropertiesModal';
import { ENGINES, IMPORT_FRAGMENT_KEY, decodeSpec, generateMql5, specChecksum, type EmilStrategySpec, type ValidationResult } from '@/lib/emil-strategy-kit';
import { FRAGMENT_KEY, readPendingEncoded } from '@/lib/trading/emil-strategy-pending';

const BUILDER_NAME = 'EMIL Strategy Builder';

// The listener hard-codes the fragment key to stay dependency-free; keep it in step.
if (FRAGMENT_KEY !== IMPORT_FRAGMENT_KEY) throw new Error('EMIL strategy import: fragment key out of step with the kit');

/** The waiting link for this tab, decoded and validated. */
export function readPendingImport(): ValidationResult | null {
  const encoded = readPendingEncoded();
  return encoded ? decodeSpec(encoded) : null;
}

/** The library id for a builder strategy: stable across versions. */
export const importedEaId = (spec: EmilStrategySpec) => `emil-sb-${spec.id}`;

const EA_TYPE: Record<string, CustomEA['type']> = { trend: 'trend', breakout: 'trend', reversal: 'reversal', pattern: 'reversal' };

export type ImportOutcome = { status: 'added' | 'updated' | 'unchanged'; ea: CustomEA };

export function importEmilStrategy(spec: EmilStrategySpec): ImportOutcome {
  const id = importedEaId(spec);
  const engine = ENGINES[spec.engine];
  const source = generateMql5(spec, BUILDER_NAME);
  const checksum = checksumOf(source);
  const existing = loadCustomEAs().find((ea) => ea.id === id);
  if (existing && existing.checksum === checksum && existing.name === spec.name) {
    return { status: 'unchanged', ea: existing };
  }

  const inputs: ExtractedInput[] = STRATEGY_INPUT_DECLS[spec.engine].map((decl) => ({
    ...decl,
    defaultValue: String(spec.params[decl.name] ?? decl.defaultValue),
  }));

  const ea: CustomEA = {
    id,
    name: spec.name,
    description: spec.description || engine.summary,
    pairs: spec.symbols,
    timeframes: [spec.timeframe],
    type: EA_TYPE[engine.family] ?? 'trend',
    rating: 4,
    status: 'available',
    custom: true,
    strategyKind: spec.engine,
    sourceKind: 'mq5',
    inputs,
    report: {
      fileKind: 'ea-source',
      sourceAvailable: true,
      detectedEngine: spec.engine,
      engineScore: 1,
      events: [],
      features: [],
      securityFlags: [],
      overall: 'converted',
      convertedAt: Date.now(),
    },
    source,
    checksum,
    uploadedAt: Date.now(),
    version: `v${spec.version} · ${specChecksum(spec)}`,
    author: BUILDER_NAME,
  };

  if (existing) removeCustomEA(id);
  saveCustomEA(ea);

  // Engine inputs: the runtime reads these through effectiveEngineParams.
  saveInputOverrides(id, Object.fromEntries(Object.entries(spec.params).map(([name, value]) => [name, String(value)])));

  // Execution settings: applied by the runtime when the EA is attached.
  let previous: Partial<EAFullSettings> = {};
  try {
    previous = JSON.parse(localStorage.getItem(`raptor_ea_full_${id}`) || '{}');
  } catch {
    /* start from defaults */
  }
  const full: EAFullSettings = {
    ...DEFAULT_FULL_SETTINGS,
    ...previous,
    lot: spec.risk.lot,
    slAtrMult: spec.risk.slAtrMult,
    tpAtrMult: spec.risk.tpAtrMult,
    direction: spec.risk.direction,
  };
  try {
    localStorage.setItem(`raptor_ea_full_${id}`, JSON.stringify(full));
  } catch {
    /* ignore quota */
  }

  return { status: existing ? 'updated' : 'added', ea };
}
