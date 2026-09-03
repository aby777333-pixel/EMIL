'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  Plus,
  Pencil,
  Clock,
  ShieldAlert,
  Zap,
  X,
  Check,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface LeverageRule {
  id: string;
  name: string;
  trigger: string;
  currentLeverage: string;
  adjustedTo: string;
  status: 'Active' | 'Standby';
  enabled: boolean;
}

interface SpreadRow {
  symbol: string;
  baseSpread: number;
  currentSpread: number;
  markup: number;
  ruleApplied: string;
}

interface RestrictionRow {
  account: string;
  restriction: string;
  reason: string;
  appliedBy: string;
  expires: string;
}

interface AutoControlEvent {
  time: string;
  type: string;
  target: string;
  oldValue: string;
  newValue: string;
  trigger: string;
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_LEVERAGE_RULES: LeverageRule[] = [
  { id: 'lr1', name: 'High Equity', trigger: 'Balance > $100K', currentLeverage: '1:500', adjustedTo: '1:200', status: 'Active', enabled: true },
  { id: 'lr2', name: 'Volatile Market', trigger: 'VIX > 30', currentLeverage: 'Default', adjustedTo: '1:50', status: 'Standby', enabled: false },
  { id: 'lr3', name: 'News Event', trigger: 'Within 15min', currentLeverage: 'Default', adjustedTo: '1:50', status: 'Active', enabled: true },
  { id: 'lr4', name: 'Toxic Client', trigger: 'Score > 4/5', currentLeverage: 'Default', adjustedTo: '1:25', status: 'Active', enabled: true },
  { id: 'lr5', name: 'Weekend', trigger: 'Friday 21:00+', currentLeverage: 'Default', adjustedTo: '1:50', status: 'Active', enabled: true },
];

const SPREAD_DATA: SpreadRow[] = [
  { symbol: 'EURUSD', baseSpread: 0.8, currentSpread: 1.2, markup: 0.4, ruleApplied: 'News spike' },
  { symbol: 'XAUUSD', baseSpread: 30, currentSpread: 45, markup: 15, ruleApplied: 'Volatile' },
  { symbol: 'BTCUSD', baseSpread: 50, currentSpread: 50, markup: 0, ruleApplied: 'None' },
];

const RESTRICTIONS: RestrictionRow[] = [
  { account: 'ACC-10078', restriction: 'Close-only', reason: 'Toxic flow', appliedBy: 'System', expires: 'Indefinite' },
  { account: 'ACC-10315', restriction: 'Max 0.5L', reason: 'Margin risk', appliedBy: 'Dealer', expires: '24h' },
];

const AUTO_EVENTS: AutoControlEvent[] = [
  { time: '14:28', type: 'Leverage', target: 'ACC-10078', oldValue: '1:500', newValue: '1:25', trigger: 'Toxic score 4' },
  { time: '14:15', type: 'Spread', target: 'XAUUSD', oldValue: '30 pip', newValue: '45 pip', trigger: 'News mode' },
  { time: '13:50', type: 'Restriction', target: 'ACC-10315', oldValue: 'None', newValue: 'Max 0.5L', trigger: 'Margin 108%' },
];

/* ------------------------------------------------------------------ */
/*  INLINE SPREAD EDITOR                                               */
/* ------------------------------------------------------------------ */

function SpreadEditor({ row, onClose }: { row: SpreadRow; onClose: () => void }) {
  const [base, setBase] = useState(row.baseSpread.toString());
  const [markup, setMarkup] = useState(row.markup.toString());
  const [shiftBid, setShiftBid] = useState('0');
  const [shiftAsk, setShiftAsk] = useState('0');

  return (
    <tr className="bg-[var(--bg-elevated)]">
      <td colSpan={6} className="px-4 py-3">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1">Base</label>
            <input
              type="number"
              step="0.1"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="w-20 bg-[var(--bg-primary)] text-foreground font-mono text-xs rounded px-2 py-1.5 border border-border focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1">Markup</label>
            <input
              type="number"
              step="0.1"
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              className="w-20 bg-[var(--bg-primary)] text-foreground font-mono text-xs rounded px-2 py-1.5 border border-border focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1">Shift Bid</label>
            <input
              type="number"
              step="0.1"
              value={shiftBid}
              onChange={(e) => setShiftBid(e.target.value)}
              className="w-20 bg-[var(--bg-primary)] text-foreground font-mono text-xs rounded px-2 py-1.5 border border-border focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[10px] text-secondary uppercase tracking-wider mb-1">Shift Ask</label>
            <input
              type="number"
              step="0.1"
              value={shiftAsk}
              onChange={(e) => setShiftAsk(e.target.value)}
              className="w-20 bg-[var(--bg-primary)] text-foreground font-mono text-xs rounded px-2 py-1.5 border border-border focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-xs text-profit px-3 py-1.5 rounded border border-profit/30 hover:bg-profit/10 transition-colors"
            >
              <Check className="h-3 w-3" /> Save
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-xs text-secondary px-3 py-1.5 rounded border border-border hover:bg-[var(--bg-hover)] transition-colors"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE COMPONENT                                                     */
/* ------------------------------------------------------------------ */

export default function ControlsPage() {
  const [leverageRules, setLeverageRules] = useState(INITIAL_LEVERAGE_RULES);
  const [editingSpread, setEditingSpread] = useState<string | null>(null);

  function toggleRule(id: string) {
    setLeverageRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, enabled: !r.enabled, status: !r.enabled ? 'Active' : 'Standby' }
          : r,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 text-[10px] text-secondary font-mono uppercase tracking-wider mb-2">
          <Link href="/broker/risk" className="hover:text-accent transition-colors">Risk</Link>
          <span className="text-muted">/</span>
          <span className="text-foreground">Controls</span>
        </div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          LEVERAGE & SPREAD CONTROLS
        </h1>
        <p className="text-xs text-secondary mt-0.5">
          Adjust Before the Market Forces You To
        </p>
      </div>

      {/* ── Section 1: Dynamic Leverage Rules ──────────────────────── */}
      <div className="rounded-lg border border-border bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Dynamic Leverage Rules</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] text-secondary uppercase tracking-wider">
                <th className="text-center px-3 py-3 w-12">On/Off</th>
                <th className="text-left px-4 py-3">Rule Name</th>
                <th className="text-left px-3 py-3">Trigger</th>
                <th className="text-center px-3 py-3">Current Leverage</th>
                <th className="text-center px-3 py-3">Adjusted To</th>
                <th className="text-center px-3 py-3">Status</th>
                <th className="text-center px-3 py-3 w-12">Edit</th>
              </tr>
            </thead>
            <tbody>
              {leverageRules.map((rule) => (
                <tr
                  key={rule.id}
                  className={`border-b border-border/50 hover:bg-[var(--bg-elevated)] transition-colors ${!rule.enabled ? 'opacity-50' : ''}`}
                >
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-profit' : 'bg-[var(--bg-primary)]'} border border-border`}
                    >
                      <span
                        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${rule.enabled ? 'left-[18px]' : 'left-0.5'}`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">{rule.name}</td>
                  <td className="px-3 py-3 font-mono text-secondary">{rule.trigger}</td>
                  <td className="px-3 py-3 text-center font-mono text-foreground">{rule.currentLeverage}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-accent">{rule.adjustedTo}</td>
                  <td className="px-3 py-3 text-center">
                    {rule.status === 'Active' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-profit/10 text-profit border border-profit/30">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-primary)] text-secondary border border-border">
                        Standby
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button className="text-secondary hover:text-accent transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors px-3 py-1.5 rounded border border-accent/30 hover:border-accent/60">
            <Plus className="h-3.5 w-3.5" />
            Add Rule
          </button>
        </div>
      </div>

      {/* ── Section 2: Spread Controls ─────────────────────────────── */}
      <div className="rounded-lg border border-border bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Zap className="h-4 w-4 text-gold" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Spread Controls</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] text-secondary uppercase tracking-wider">
                <th className="text-left px-4 py-3">Symbol</th>
                <th className="text-right px-3 py-3">Base Spread</th>
                <th className="text-right px-3 py-3">Current Spread</th>
                <th className="text-right px-3 py-3">Markup</th>
                <th className="text-left px-3 py-3">Rule Applied</th>
                <th className="text-center px-3 py-3 w-16">Override</th>
              </tr>
            </thead>
            <tbody>
              {SPREAD_DATA.map((row) => (
                <>
                  <tr
                    key={row.symbol}
                    className="border-b border-border/50 hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-foreground">{row.symbol}</td>
                    <td className="px-3 py-3 text-right font-mono text-secondary">
                      {row.baseSpread} {row.baseSpread < 5 ? 'pip' : 'pips'}
                    </td>
                    <td className={`px-3 py-3 text-right font-mono font-semibold ${row.markup > 0 ? 'text-gold' : 'text-foreground'}`}>
                      {row.currentSpread} {row.currentSpread < 5 ? 'pip' : 'pips'}
                    </td>
                    <td className={`px-3 py-3 text-right font-mono ${row.markup > 0 ? 'text-loss' : 'text-muted'}`}>
                      {row.markup > 0 ? `+${row.markup}` : '0'}
                    </td>
                    <td className="px-3 py-3 text-secondary">
                      {row.ruleApplied !== 'None' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gold/10 text-gold border border-gold/30">
                          {row.ruleApplied}
                        </span>
                      ) : (
                        <span className="text-muted">None</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => setEditingSpread(editingSpread === row.symbol ? null : row.symbol)}
                        className="text-xs text-accent hover:text-accent/80 transition-colors px-2 py-1 rounded border border-accent/30 hover:border-accent/60"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                  {editingSpread === row.symbol && (
                    <SpreadEditor
                      key={`edit-${row.symbol}`}
                      row={row}
                      onClose={() => setEditingSpread(null)}
                    />
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Trading Restrictions ─────────────────────────── */}
      <div className="rounded-lg border border-border bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <ShieldAlert className="h-4 w-4 text-loss" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Trading Restrictions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] text-secondary uppercase tracking-wider">
                <th className="text-left px-4 py-3">Account</th>
                <th className="text-left px-3 py-3">Restriction</th>
                <th className="text-left px-3 py-3">Reason</th>
                <th className="text-left px-3 py-3">Applied By</th>
                <th className="text-left px-3 py-3">Expires</th>
                <th className="text-center px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {RESTRICTIONS.map((row) => (
                <tr
                  key={row.account}
                  className="border-b border-border/50 hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-accent">{row.account}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-loss/10 text-loss border border-loss/30">
                      {row.restriction}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-secondary">{row.reason}</td>
                  <td className="px-3 py-3 text-foreground">{row.appliedBy}</td>
                  <td className="px-3 py-3">
                    <span className={`font-mono ${row.expires === 'Indefinite' ? 'text-loss' : 'text-gold'}`}>
                      {row.expires}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-xs text-profit px-2 py-1 rounded border border-profit/30 hover:bg-profit/10 transition-colors">
                        Lift
                      </button>
                      <button className="text-xs text-gold px-2 py-1 rounded border border-gold/30 hover:bg-gold/10 transition-colors">
                        Extend
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-1.5 text-xs text-loss hover:text-loss/80 transition-colors px-3 py-1.5 rounded border border-loss/30 hover:border-loss/60">
            <Plus className="h-3.5 w-3.5" />
            Add Restriction
          </button>
        </div>
      </div>

      {/* ── Section 4: Auto-Control Events Log ─────────────────────── */}
      <div className="rounded-lg border border-border bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Clock className="h-4 w-4 text-teal" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Auto-Control Events Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] text-secondary uppercase tracking-wider">
                <th className="text-left px-4 py-3">Time</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-left px-3 py-3">Symbol / Account</th>
                <th className="text-center px-3 py-3">Old Value</th>
                <th className="text-center px-3 py-3">New Value</th>
                <th className="text-left px-3 py-3">Trigger</th>
              </tr>
            </thead>
            <tbody>
              {AUTO_EVENTS.map((evt, i) => {
                const typeColor =
                  evt.type === 'Leverage' ? 'text-accent' :
                  evt.type === 'Spread' ? 'text-gold' :
                  'text-loss';

                return (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-secondary">{evt.time}</td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${typeColor}`}>{evt.type}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-accent">{evt.target}</td>
                    <td className="px-3 py-3 text-center font-mono text-muted line-through">{evt.oldValue}</td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-foreground">{evt.newValue}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[var(--bg-primary)] text-secondary border border-border">
                        {evt.trigger}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
