'use client';

// ═══════════════════════════════════════════════════════════════
// Trade Journal module (enhancement prompt §5). Modular overlay —
// lazy-loaded, entitlement-gated (trade_journal), display-only.
// Trades = the account's REAL closed positions; annotations persist in
// trade_journal (owner-only RLS); analytics computed from actual results.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import { X, BookOpen, BarChart3, Download, RefreshCw, Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { orderService } from '@/lib/trading/order-service';
import {
  REASONS, EMOTIONS, normalizeTrade, fetchJournalEntries, saveJournalEntry,
  computeAnalytics, buildCsv, fmtDuration, type ClosedTrade, type JournalEntry,
} from '@/lib/insights/journal';

type Tab = 'trades' | 'analytics';

const fmt = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pnlColor = (v: number) => (v > 0 ? '#00C27A' : v < 0 ? '#FF5252' : 'rgba(255,255,255,0.6)');

function BucketTable({ title, rows }: { title: string; rows: { key: string; n: number; pnl: number; winRate: number }[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">{title}</div>
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between border-t border-white/[0.04] py-1 font-mono text-[10px]">
          <span className="text-white/70">{r.key}</span>
          <span className="text-white/40">{r.n} trade{r.n === 1 ? '' : 's'} · {r.winRate.toFixed(0)}% win</span>
          <span style={{ color: pnlColor(r.pnl) }}>{fmt(r.pnl)}</span>
        </div>
      ))}
    </div>
  );
}

export default function JournalPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('trades');
  const activeAccountId = useTradingStore((s) => s.activeAccountId);
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'signed-out'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, JournalEntry>>({});
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      if (!activeAccountId) { setLoadState('signed-out'); return; }
      try {
        const rows = await orderService.getTradeHistory(activeAccountId, 200);
        if (!live) return;
        const normalized = (rows ?? []).map(normalizeTrade);
        const entries = await fetchJournalEntries(normalized.map((t) => t.id));
        if (!live) return;
        for (const t of normalized) t.journal = entries.get(t.id) ?? null;
        setTrades(normalized);
        setLoadState('ready');
      } catch {
        if (live) setLoadState('signed-out');
      }
    })();
    return () => { live = false; };
  }, [activeAccountId, reloadKey]);

  const analytics = useMemo(() => computeAnalytics(trades), [trades]);

  const draftFor = (t: ClosedTrade): JournalEntry =>
    drafts[t.id] ?? {
      position_id: t.id,
      reason: t.journal?.reason ?? null,
      emotion: t.journal?.emotion ?? null,
      notes: t.journal?.notes ?? null,
      mistakes: t.journal?.mistakes ?? null,
      lessons: t.journal?.lessons ?? null,
    };

  const setDraft = (id: string, patch: Partial<JournalEntry>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? draftFor(trades.find((t) => t.id === id)!)), ...patch } }));

  const save = async (t: ClosedTrade) => {
    const d = draftFor(t);
    const res = await saveJournalEntry({ ...d, account_id: activeAccountId });
    if (res.ok) {
      setTrades((prev) => prev.map((x) => (x.id === t.id ? { ...x, journal: d } : x)));
      setNotice(`Journal saved for ${t.symbol} (${new Date(t.closed_at).toLocaleDateString()}).`);
    } else {
      setNotice(`Save failed: ${res.error}`);
    }
  };

  const askNexus = (t: ClosedTrade) => {
    const q = `Review this closed trade like a coach: ${t.direction} ${t.size} ${t.symbol}, opened ${t.open_price} → closed ${t.close_price}, P&L ${fmt(t.realized_pnl)}, held ${fmtDuration(t.opened_at, t.closed_at)}${t.journal?.reason ? `, my stated reason: ${t.journal.reason}` : ''}${t.journal?.emotion ? `, my emotion: ${t.journal.emotion}` : ''}. What did I do well and what should I change?`;
    window.dispatchEvent(new CustomEvent('nexus-ask', { detail: { question: q } }));
    onClose();
  };

  const exportCsv = () => {
    const blob = new Blob([buildCsv(trades)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `raptor_trade_journal_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice(`${trades.length} trades exported (opens in Excel).`);
  };

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onMouseDown={onClose}>
      <div
        className="flex max-h-[88vh] w-[860px] max-w-[96vw] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[13px] font-bold text-white">Trade Journal</div>
            <div className="text-[10px] text-white/40">Your real closed trades · annotations save to your account · analytics from actual results</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} disabled={trades.length === 0} title="Export CSV (Excel)"
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold disabled:opacity-30"
              style={{ backgroundColor: 'rgba(0,145,213,0.15)', color: '#0091D5', border: '1px solid rgba(0,145,213,0.3)' }}>
              <Download size={10} /> CSV
            </button>
            <button onClick={() => setReloadKey((k) => k + 1)} title="Refresh" className="text-white/40 hover:text-white"><RefreshCw size={13} /></button>
            <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
          </div>
        </div>

        <div className="flex gap-0.5 border-b px-2 pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {([['trades', `Trades (${trades.length})`, BookOpen], ['analytics', 'Analytics', BarChart3]] as [Tab, string, typeof BookOpen][]).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 rounded-t px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{ backgroundColor: tab === t ? 'rgba(41,171,226,0.12)' : 'transparent', color: tab === t ? '#0091D5' : 'rgba(255,255,255,0.45)' }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {notice && (
          <div className="border-b px-4 py-2 text-[10px]" style={{ borderColor: 'rgba(0,145,213,0.25)', backgroundColor: 'rgba(0,145,213,0.06)', color: '#7fc4e8' }}>
            {notice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 text-[11px]">
          {loadState === 'loading' ? (
            <div className="py-8 text-center text-white/35">Loading closed trades…</div>
          ) : loadState === 'signed-out' ? (
            <div className="py-8 text-center text-white/35">
              Sign in with a trading account to use the journal — it works on your real closed trades, so there is nothing honest to show without them.
            </div>
          ) : trades.length === 0 ? (
            <div className="py-8 text-center text-white/35">No closed trades yet — the journal fills itself as you trade.</div>
          ) : tab === 'trades' ? (
            <div>
              {trades.map((t) => {
                const d = draftFor(t);
                const isOpen = expanded === t.id;
                const annotated = !!(t.journal && (t.journal.reason || t.journal.emotion || t.journal.notes));
                return (
                  <div key={t.id} className="border-t border-white/[0.05]">
                    <button onClick={() => setExpanded(isOpen ? null : t.id)} className="flex w-full items-center gap-2 py-2 text-left font-mono text-[10px] hover:bg-white/[0.02]">
                      {isOpen ? <ChevronDown size={11} className="shrink-0 text-white/30" /> : <ChevronRight size={11} className="shrink-0 text-white/30" />}
                      <span className="w-[74px] shrink-0 text-white/40">{new Date(t.closed_at).toLocaleDateString()}</span>
                      <span className="w-16 shrink-0 font-bold text-white">{t.symbol}</span>
                      <span className="w-9 shrink-0" style={{ color: t.direction === 'BUY' ? '#00C27A' : '#FF5252' }}>{t.direction}</span>
                      <span className="w-11 shrink-0 text-white/60">{t.size.toFixed(2)}</span>
                      <span className="hidden w-32 shrink-0 text-white/45 sm:inline">{t.open_price} → {t.close_price ?? '—'}</span>
                      <span className="w-14 shrink-0 text-white/40">{fmtDuration(t.opened_at, t.closed_at)}</span>
                      <span className="flex-1 text-right font-bold" style={{ color: pnlColor(t.realized_pnl) }}>{fmt(t.realized_pnl)}</span>
                      <span className="w-16 shrink-0 text-right text-[8.5px] uppercase" style={{ color: annotated ? '#00C27A' : 'rgba(255,255,255,0.25)' }}>
                        {annotated ? 'journaled' : '—'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mb-2 ml-5 rounded-md border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <div className="mb-2 grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="mb-0.5 block text-[9px] uppercase tracking-wide text-white/40">Reason for the trade</span>
                            <select value={d.reason ?? ''} onChange={(e) => setDraft(t.id, { reason: e.target.value || null })}
                              className="w-full rounded border bg-[#060D16] px-2 py-1 text-[11px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                              <option value="">— not set —</option>
                              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-0.5 block text-[9px] uppercase tracking-wide text-white/40">Emotion at entry</span>
                            <select value={d.emotion ?? ''} onChange={(e) => setDraft(t.id, { emotion: e.target.value || null })}
                              className="w-full rounded border bg-[#060D16] px-2 py-1 text-[11px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                              <option value="">— not set —</option>
                              {EMOTIONS.map((e2) => <option key={e2} value={e2}>{e2}</option>)}
                            </select>
                          </label>
                        </div>
                        {([['notes', 'Notes'], ['mistakes', 'Mistakes'], ['lessons', 'Lessons']] as ['notes' | 'mistakes' | 'lessons', string][]).map(([k, label]) => (
                          <label key={k} className="mb-2 block">
                            <span className="mb-0.5 block text-[9px] uppercase tracking-wide text-white/40">{label}</span>
                            <textarea value={d[k] ?? ''} onChange={(e) => setDraft(t.id, { [k]: e.target.value || null })}
                              rows={k === 'notes' ? 2 : 1}
                              className="w-full resize-none rounded border bg-[#060D16] px-2 py-1 text-[11px] text-white outline-none" style={{ borderColor: 'rgba(255,255,255,0.12)' }} />
                          </label>
                        ))}
                        <div className="flex items-center gap-2">
                          <button onClick={() => void save(t)}
                            className="rounded px-3 py-1 text-[10px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}>
                            Save journal
                          </button>
                          <button onClick={() => askNexus(t)}
                            className="flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-bold"
                            style={{ backgroundColor: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                            <Brain size={10} /> NEXUS review
                          </button>
                          <span className="text-[9px] text-white/30">commission {fmt(t.commission)} · swap {fmt(t.swap_accrued)}{t.comment ? ` · ${t.comment}` : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {([
                  ['Trades', String(analytics.total)],
                  ['Win rate', `${analytics.winRate.toFixed(1)}%`],
                  ['Profit factor', analytics.profitFactor != null ? analytics.profitFactor.toFixed(2) : '—'],
                  ['Avg win', fmt(analytics.avgWin)],
                  ['Avg loss', fmt(analytics.avgLoss)],
                  ['Expectancy', fmt(analytics.expectancy)],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="rounded-md border px-2 py-1.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div className="text-[8.5px] uppercase tracking-wide text-white/35">{k}</div>
                    <div className="font-mono text-[12px] font-bold text-white/85">{v}</div>
                  </div>
                ))}
              </div>
              {analytics.best && analytics.worst && (
                <div className="mb-4 font-mono text-[10px] text-white/50">
                  Best: <span style={{ color: '#00C27A' }}>{analytics.best.symbol} {fmt(analytics.best.realized_pnl)}</span>
                  <span className="mx-2">·</span>
                  Worst: <span style={{ color: '#FF5252' }}>{analytics.worst.symbol} {fmt(analytics.worst.realized_pnl)}</span>
                  <span className="mx-2">·</span>
                  {analytics.annotated}/{analytics.total} trades journaled
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <BucketTable title="By symbol" rows={analytics.bySymbol} />
                <BucketTable title="By direction" rows={analytics.byDirection} />
                <BucketTable title="By open hour (UTC)" rows={analytics.byOpenHourBucket} />
                <div className="space-y-4">
                  <BucketTable title="By emotion (journaled trades)" rows={analytics.byEmotion} />
                  <BucketTable title="By reason (journaled trades)" rows={analytics.byReason} />
                </div>
              </div>
              <p className="mt-4 text-[9px] leading-snug text-white/30">
                All figures from your last {trades.length} closed trades. Emotion/reason breakdowns only include trades you journaled — journal more trades to make them meaningful.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
