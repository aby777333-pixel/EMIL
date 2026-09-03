'use client';

// Shield — Trader Protection menu. Shared-header dropdown holding the
// self-imposed risk rules enforced at the order gate (lib/trading/protection).
// Every rule is a trader decision: dull switch = OFF, bright 3D glow = ON.
// The component also runs the always-on monitor: margin-level warning ladder
// (toasts at 300/200/150%) and the equity-floor kill switch (close everything
// + lock trading for 24h when equity touches the floor the trader set).

import { useCallback, useEffect, useRef, useState } from 'react';
import { Shield, ChevronDown } from 'lucide-react';
import HeaderPortal from './HeaderPortal';
import { headerBtnStyle } from './header-theme';
import { useTradingStore } from '@/stores/trading';
import {
  loadProtectionSettings, saveProtectionSettings, PROTECTION_DEFAULTS,
  getLock, setLock, loadDayStats, invalidateDayStats,
  type ProtectionSettings, type DayStats, type ProtectionLock,
} from '@/lib/trading/protection';
import { orderService } from '@/lib/trading/order-service';

const MINT = '#00E5A0';
const MARGIN_TIERS = [300, 200, 150];

export default function ProtectionMenu({ onToast }: { onToast: (msg: string) => void }) {
  const accountId = useTradingStore((s) => s.activeAccountId);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<ProtectionSettings>(PROTECTION_DEFAULTS);
  const [stats, setStats] = useState<DayStats | null>(null);
  const [lock, setLockState] = useState<ProtectionLock | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const firedTiers = useRef<Set<number>>(new Set());
  const floorFiring = useRef(false);

  // Load per-account settings + lock whenever the account changes.
  useEffect(() => {
    setSettings(loadProtectionSettings(accountId));
    setLockState(getLock(accountId));
  }, [accountId]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Refresh day stats while the panel is open.
  useEffect(() => {
    if (!open || !accountId) return;
    let active = true;
    const load = async () => { const s = await loadDayStats(accountId); if (active) setStats(s); };
    load();
    const id = setInterval(() => { invalidateDayStats(); load(); }, 10_000);
    return () => { active = false; clearInterval(id); };
  }, [open, accountId]);

  const update = useCallback((patch: (s: ProtectionSettings) => void) => {
    setSettings((prev) => {
      const next = structuredClone(prev);
      patch(next);
      saveProtectionSettings(accountId, next);
      return next;
    });
  }, [accountId]);

  // Master switch: arm or disarm every rule at once (params are kept).
  const setAll = useCallback((on: boolean) => {
    update((s) => {
      (Object.keys(s) as (keyof ProtectionSettings)[]).forEach((k) => { s[k].on = on; });
    });
  }, [update]);

  // ── Always-on monitor: margin ladder + equity floor ───────────
  useEffect(() => {
    const id = setInterval(async () => {
      const s = loadProtectionSettings(accountId);
      const summary = useTradingStore.getState().accountSummary;
      const equity = Number(summary?.equity ?? 0);
      const marginLevel = Number(summary?.margin_level_pct ?? 0);

      // Margin-level early-warning ladder (warnings only, never blocks).
      if (s.marginLadder.on && marginLevel > 0) {
        for (const tier of MARGIN_TIERS) {
          if (marginLevel <= tier && !firedTiers.current.has(tier)) {
            firedTiers.current.add(tier);
            onToast(`⚠ Margin level ${marginLevel.toFixed(0)}% — below the ${tier}% warning line. Consider reducing exposure before a margin call nears.`);
          }
          if (marginLevel > tier + 30) firedTiers.current.delete(tier); // re-arm after recovery
        }
      }

      // Equity-floor kill switch: close everything + 24h lock.
      if (s.equityFloor.on && s.equityFloor.equity > 0 && equity > 0 &&
          equity <= s.equityFloor.equity && accountId && !getLock(accountId) && !floorFiring.current) {
        floorFiring.current = true;
        try {
          setLock(accountId, 24, `Equity touched your floor of $${s.equityFloor.equity} — you asked for a full stop.`);
          setLockState(getLock(accountId));
          const prices = useTradingStore.getState().prices;
          const positions = (await orderService.getOpenPositions(accountId)) as Array<{ id: string; symbol: string; direction: string; open_price: number; current_price: number | null }>;
          let closed = 0;
          for (const p of positions) {
            const t = prices[p.symbol];
            const cp = p.direction === 'BUY' ? (t?.bid ?? p.current_price ?? p.open_price) : (t?.ask ?? p.current_price ?? p.open_price);
            try { await orderService.closePosition(p.id, Number(cp)); closed++; } catch { /* may already be closed */ }
          }
          useTradingStore.getState().triggerRefresh();
          onToast(`⛔ EQUITY FLOOR HIT ($${equity.toFixed(0)}) — closed ${closed} position(s). Trading locked for 24h. This is the kill switch you set in a calm moment.`);
        } finally {
          floorFiring.current = false;
        }
      }
    }, 5_000);
    return () => clearInterval(id);
  }, [accountId, onToast]);

  const activeCount = [
    settings.dailyLossLimit.on, settings.profitLockIn.on, settings.mandatorySL.on,
    settings.riskCap.on, settings.lossCooldown.on, settings.revengeGuard.on,
    settings.overtradeGovernor.on, settings.correlationGuard.on, settings.marginLadder.on,
    settings.spreadGuard.on, settings.equityFloor.on, settings.newsGuard.on,
  ].filter(Boolean).length;

  const lockHoursLeft = lock ? Math.max(0, Math.ceil((lock.until - Date.now()) / 3_600_000)) : 0;

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Shield — trader protection rules (you decide, the platform enforces)"
        className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
        style={headerBtnStyle('protect', open || activeCount > 1)}
      >
        <Shield size={12} /> <span className="hidden 2xl:inline">Shield</span>
        {activeCount > 0 && <span className="rounded bg-white/15 px-1 text-[9px]">{activeCount}</span>}
        <ChevronDown size={10} />
      </button>

      <HeaderPortal open={open} anchorRef={ref}>
        <div className="w-[380px] overflow-y-auto rounded-lg border shadow-2xl" style={{ maxHeight: 520, backgroundColor: '#0A0F1A', borderColor: 'rgba(0,229,160,0.25)', scrollbarWidth: 'thin' }}>
          {/* Header + live status */}
          <div className="border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: MINT }}>
                <Shield size={13} /> Trader Protection
              </span>
              <span className="text-[9px] text-white/35">{activeCount} rule{activeCount === 1 ? '' : 's'} active</span>
            </div>
            <p className="mt-1 text-[9px] leading-relaxed text-white/40">
              Self-imposed rules, set by YOU in calm moments and enforced automatically in bad ones.
              They gate <b>new</b> orders only — closing positions is never blocked. All order surfaces
              obey them, including EAs.
            </p>
            {/* Master switch — arm/disarm everything, or pick rules individually below */}
            {/* One-click presets — bundles of the same 12 rules, tuned by
                temperament. Amounts are starting points; edit any rule after. */}
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {([
                ['🛡 Conservative', 'Tightest protection: $300 daily stop, 1% risk cap, mandatory SL, 2-loss cooldown, 5 trades/day, news guard on.', {
                  dailyLossLimit: { on: true, amount: 300 }, profitLockIn: { on: false, amount: 1000 }, mandatorySL: { on: true },
                  riskCap: { on: true, pct: 1 }, lossCooldown: { on: true, losses: 2, minutes: 60 }, revengeGuard: { on: true, minutes: 15 },
                  overtradeGovernor: { on: true, maxPerDay: 5 }, correlationGuard: { on: true, maxSameCurrency: 2 }, marginLadder: { on: true },
                  spreadGuard: { on: true, maxPips: 5 }, equityFloor: { on: false, equity: 0 }, newsGuard: { on: true, minutes: 30 },
                }],
                ['⚖ Balanced', 'Sensible defaults: $500 daily stop, 2% risk cap, mandatory SL, 3-loss cooldown, 10 trades/day, news guard on.', {
                  dailyLossLimit: { on: true, amount: 500 }, profitLockIn: { on: false, amount: 1000 }, mandatorySL: { on: true },
                  riskCap: { on: true, pct: 2 }, lossCooldown: { on: true, losses: 3, minutes: 30 }, revengeGuard: { on: true, minutes: 10 },
                  overtradeGovernor: { on: true, maxPerDay: 10 }, correlationGuard: { on: true, maxSameCurrency: 3 }, marginLadder: { on: true },
                  spreadGuard: { on: true, maxPips: 6 }, equityFloor: { on: false, equity: 0 }, newsGuard: { on: true, minutes: 30 },
                }],
                ['🌊 Minimal', 'Margin warnings only — every other rule off. You trade with no self-imposed protections.', {
                  ...PROTECTION_DEFAULTS,
                }],
              ] as const).map(([label, desc, preset]) => (
                <button key={label}
                  onClick={() => { const next = JSON.parse(JSON.stringify(preset)) as ProtectionSettings; setSettings(next); saveProtectionSettings(accountId, next); }}
                  title={desc}
                  className="rounded py-1.5 text-[9px] font-bold transition-all hover:brightness-125"
                  style={{ backgroundColor: 'rgba(0,229,160,0.07)', color: 'rgba(0,229,160,0.85)', border: '1px solid rgba(0,229,160,0.3)' }}>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setAll(true)}
                className="rounded py-1.5 text-[10px] font-bold transition-all hover:brightness-110"
                style={{
                  background: 'linear-gradient(180deg, rgba(0,229,160,0.35) 0%, rgba(0,229,160,0.12) 100%)',
                  color: MINT, border: '1px solid rgba(0,229,160,0.6)',
                  boxShadow: '0 0 10px rgba(0,229,160,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
                title="Arm every protection rule at once (your amounts and limits are kept)"
              >
                🛡 ALL ON — full shield
              </button>
              <button
                onClick={() => setAll(false)}
                className="rounded py-1.5 text-[10px] font-bold transition-all hover:brightness-110"
                style={{
                  backgroundColor: 'rgba(255,82,82,0.08)', color: 'rgba(255,82,82,0.8)',
                  border: '1px solid rgba(255,82,82,0.3)',
                }}
                title="Disarm every rule — you trade with no self-imposed protections"
              >
                ALL OFF — no shield
              </button>
            </div>
            {lock && (
              <div className="mt-2 rounded border px-2 py-1.5 text-[10px]" style={{ borderColor: 'rgba(255,82,82,0.4)', backgroundColor: 'rgba(255,82,82,0.1)', color: '#FF5252' }}>
                ⛔ Trading locked ~{lockHoursLeft}h — {lock.reason}
              </div>
            )}
            {stats && (
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <StatCell label="P&L today" value={`${stats.realizedToday >= 0 ? '+' : ''}$${stats.realizedToday.toFixed(0)}`} color={stats.realizedToday >= 0 ? '#00C27A' : '#FF5252'} />
                <StatCell label="Trades today" value={String(stats.tradesToday)} />
                <StatCell label="Loss streak" value={String(stats.consecLosses)} color={stats.consecLosses >= 3 ? '#FFB300' : undefined} />
              </div>
            )}
          </div>

          {/* Capital protection */}
          <Section title="Capital protection — survive first">
            <Rule
              on={settings.dailyLossLimit.on}
              toggle={() => update((s) => { s.dailyLossLimit.on = !s.dailyLossLimit.on; })}
              name="Daily loss circuit-breaker"
              desc="When today's realized loss hits your limit, new orders stop until tomorrow. The single most profitable rule for most traders."
              params={<AmountInput label="Max daily loss $" value={settings.dailyLossLimit.amount} onChange={(v) => update((s) => { s.dailyLossLimit.amount = v; })} />}
            />
            <Rule
              on={settings.equityFloor.on}
              toggle={() => update((s) => { s.equityFloor.on = !s.equityFloor.on; })}
              name="Equity floor — kill switch"
              desc="If account equity touches this level, ALL positions are closed and trading locks for 24h. Set it in a calm moment; it executes in a bad one."
              params={<AmountInput label="Floor equity $" value={settings.equityFloor.equity} onChange={(v) => update((s) => { s.equityFloor.equity = v; })} />}
            />
            <Rule
              on={settings.riskCap.on}
              toggle={() => update((s) => { s.riskCap.on = !s.riskCap.on; })}
              name="Risk-per-trade cap"
              desc="Rejects any order whose stop-loss distance risks more than this % of equity. Pairs naturally with Mandatory SL."
              params={<AmountInput label="Max risk % equity" value={settings.riskCap.pct} onChange={(v) => update((s) => { s.riskCap.pct = v; })} step={0.5} />}
            />
            <Rule
              on={settings.mandatorySL.on}
              toggle={() => update((s) => { s.mandatorySL.on = !s.mandatorySL.on; })}
              name="Mandatory stop-loss"
              desc="No order without a stop loss attached — unbounded downside is not a strategy."
            />
            <Rule
              on={settings.marginLadder.on}
              toggle={() => update((s) => { s.marginLadder.on = !s.marginLadder.on; })}
              name="Margin early-warning ladder"
              desc="Warnings at 300% / 200% / 150% margin level — long before a margin call nears. Never blocks; it only warns."
            />
            <Rule
              on={settings.correlationGuard.on}
              toggle={() => update((s) => { s.correlationGuard.on = !s.correlationGuard.on; })}
              name="Correlation guard"
              desc="Blocks a new order when too many open positions already share one currency — four USD-longs is one oversized trade, not four ideas."
              params={<AmountInput label="Max per currency" value={settings.correlationGuard.maxSameCurrency} onChange={(v) => update((s) => { s.correlationGuard.maxSameCurrency = Math.max(1, Math.round(v)); })} step={1} />}
            />
          </Section>

          {/* Psychology */}
          <Section title="Psychology — the real enemy">
            <Rule
              on={settings.lossCooldown.on}
              toggle={() => update((s) => { s.lossCooldown.on = !s.lossCooldown.on; })}
              name="Consecutive-loss cooldown"
              desc="After N losses in a row, trading pauses for a cooling-off window. Tilt is invisible from the inside."
              params={<>
                <AmountInput label="Losses in a row" value={settings.lossCooldown.losses} onChange={(v) => update((s) => { s.lossCooldown.losses = Math.max(2, Math.round(v)); })} step={1} />
                <AmountInput label="Cooldown min" value={settings.lossCooldown.minutes} onChange={(v) => update((s) => { s.lossCooldown.minutes = Math.max(5, Math.round(v)); })} step={5} />
              </>}
            />
            <Rule
              on={settings.revengeGuard.on}
              toggle={() => update((s) => { s.revengeGuard.on = !s.revengeGuard.on; })}
              name="Revenge-trade guard"
              desc="Blocks re-entering the SAME symbol with a BIGGER size within minutes of a loss — the classic revenge pattern."
              params={<AmountInput label="Window min" value={settings.revengeGuard.minutes} onChange={(v) => update((s) => { s.revengeGuard.minutes = Math.max(1, Math.round(v)); })} step={1} />}
            />
            <Rule
              on={settings.overtradeGovernor.on}
              toggle={() => update((s) => { s.overtradeGovernor.on = !s.overtradeGovernor.on; })}
              name="Overtrading governor"
              desc="A hard daily trade-count limit. Most traders' winning days have FEWER trades than their losing days."
              params={<AmountInput label="Max trades/day" value={settings.overtradeGovernor.maxPerDay} onChange={(v) => update((s) => { s.overtradeGovernor.maxPerDay = Math.max(1, Math.round(v)); })} step={1} />}
            />
            <Rule
              on={settings.profitLockIn.on}
              toggle={() => update((s) => { s.profitLockIn.on = !s.profitLockIn.on; })}
              name="Profit lock-in — bank the win"
              desc="Once today's realized profit reaches your target, new orders stop. Green days turn red in the late session."
              params={<AmountInput label="Daily target $" value={settings.profitLockIn.amount} onChange={(v) => update((s) => { s.profitLockIn.amount = v; })} />}
            />
          </Section>

          {/* Execution quality */}
          <Section title="Execution quality">
            <Rule
              on={settings.spreadGuard.on}
              toggle={() => update((s) => { s.spreadGuard.on = !s.spreadGuard.on; })}
              name="Spread guard"
              desc="Refuses to fill into an abnormally wide spread (news spikes, rollover) — wide spreads silently hand your edge away."
              params={<AmountInput label="Max spread pips" value={settings.spreadGuard.maxPips} onChange={(v) => update((s) => { s.spreadGuard.maxPips = v; })} step={0.5} />}
            />
            <Rule
              on={settings.newsGuard.on}
              toggle={() => update((s) => { s.newsGuard.on = !s.newsGuard.on; })}
              name="News guard"
              desc="Blocks new orders within a window around HIGH-impact economic releases touching the symbol's currencies (real ForexFactory calendar). Spreads explode and stops slip through news — let it pass."
              params={<AmountInput label="Window min" value={settings.newsGuard.minutes} onChange={(v) => update((s) => { s.newsGuard.minutes = Math.max(5, Math.round(v)); })} step={5} />}
            />
          </Section>

          <p className="border-t px-3 py-2 text-[9px] leading-relaxed text-white/30" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            Protection rules are decision aids you configure yourself — they reduce preventable mistakes
            but cannot prevent losses, and they are not financial advice. Rules apply per account on this device.
          </p>
        </div>
      </HeaderPortal>
    </div>
  );
}

// ── Small building blocks ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/30">{title}</div>
      {children}
    </div>
  );
}

function Rule({ on, toggle, name, desc, params }: {
  on: boolean; toggle: () => void; name: string; desc: string; params?: React.ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-start gap-2">
        <GlowSwitch on={on} toggle={toggle} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold" style={{ color: on ? '#FFFFFF' : 'rgba(255,255,255,0.55)' }}>{name}</div>
          <p className="mt-0.5 text-[9px] leading-relaxed text-white/40">{desc}</p>
          {on && params && <div className="mt-1.5 flex flex-wrap gap-2">{params}</div>}
        </div>
      </div>
    </div>
  );
}

/** 3D glowing switch: dull grey OFF → bright mint glow ON. */
function GlowSwitch({ on, toggle }: { on: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="relative mt-0.5 shrink-0 rounded-full transition-all"
      style={{
        width: 34, height: 18,
        background: on
          ? `linear-gradient(180deg, rgba(0,229,160,0.55) 0%, rgba(0,229,160,0.25) 100%)`
          : 'rgba(255,255,255,0.1)',
        border: `1px solid ${on ? 'rgba(0,229,160,0.8)' : 'rgba(255,255,255,0.15)'}`,
        boxShadow: on
          ? '0 0 10px rgba(0,229,160,0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
          : 'inset 0 1px 2px rgba(0,0,0,0.4)',
      }}
      title={on ? 'ON — click to disable' : 'OFF — click to enable'}
    >
      <span
        className="absolute top-[2px] rounded-full transition-all"
        style={{
          width: 12, height: 12,
          left: on ? 18 : 2,
          background: on ? '#00E5A0' : 'rgba(255,255,255,0.5)',
          boxShadow: on ? '0 0 8px rgba(0,229,160,0.9)' : 'none',
        }}
      />
    </button>
  );
}

function AmountInput({ label, value, onChange, step = 50 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <label className="flex items-center gap-1.5 text-[9px] text-white/45">
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(v); }}
        className="w-[70px] rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-white outline-none"
        style={{ border: '1px solid rgba(0,229,160,0.25)' }}
      />
    </label>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded px-1 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
      <div className="font-mono text-[11px] font-bold" style={{ color: color ?? 'rgba(255,255,255,0.85)' }}>{value}</div>
      <div className="text-[8px] uppercase tracking-wide text-white/30">{label}</div>
    </div>
  );
}
