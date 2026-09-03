'use client';

// Chart Templates / Layouts (super-prompt §1 / §11). A shared-header menu that
// saves and restores a full chart context: symbol + timeframe (which drive BOTH
// the TradingView and RAPTOR charts) plus the RAPTOR chart-type and indicator
// set. Templates persist in localStorage. Loading a template updates the shared
// store (symbol/TF) and pushes the chart-type + indicators to the RAPTOR chart
// via the raptor-apply-template event.

import { useEffect, useRef, useState } from 'react';
import { LayoutTemplate, Plus, Trash2, ChevronDown, Download, Check, Cloud } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import { createClient } from '@/lib/supabase/client';
import HeaderPortal from './HeaderPortal';
import { headerBtnStyle } from './header-theme';

interface ChartTemplate {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  chartType: string;
  indicators: string[];
  createdAt: number;
  /** Set when the template lives in Supabase (cloud-synced, follows the account). */
  cloudId?: string;
}

const KEY = 'raptor_chart_templates';

function load(): ChartTemplate[] {
  try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
}

export default function TemplatesMenu({ onToast }: { onToast: (msg: string) => void }) {
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const activeTimeframe = useTradingStore((s) => s.activeTimeframe);
  const raptorChartType = useTradingStore((s) => s.raptorChartType);
  const raptorIndicators = useTradingStore((s) => s.raptorIndicators);
  const setActiveSymbol = useTradingStore((s) => s.setActiveSymbol);
  const setActiveTimeframe = useTradingStore((s) => s.setActiveTimeframe);

  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ChartTemplate[]>([]);
  const [name, setName] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load local templates, then (when signed in) merge the account's cloud
  // templates on top. Signed-out or offline keeps working from localStorage.
  useEffect(() => {
    setTemplates(load());
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !active) return;
        setSignedIn(true);
        const { data } = await supabase
          .from('chart_templates')
          .select('id, name, symbol, timeframe, chart_type, indicators, created_at')
          .order('created_at', { ascending: false });
        if (!data || !active) return;
        const cloud: ChartTemplate[] = data.map((r) => ({
          id: `cloud-${r.id}`,
          cloudId: r.id as string,
          name: r.name as string,
          symbol: r.symbol as string,
          timeframe: r.timeframe as string,
          chartType: (r.chart_type as string) ?? 'candlestick',
          indicators: Array.isArray(r.indicators) ? (r.indicators as string[]) : [],
          createdAt: new Date(r.created_at as string).getTime(),
        }));
        setTemplates((prev) => [
          ...cloud,
          ...prev.filter((t) => !t.cloudId && !cloud.some((c) => c.name === t.name && c.symbol === t.symbol && c.timeframe === t.timeframe)),
        ]);
      } catch { /* signed-out / offline — local templates still work */ }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Only local (non-cloud) templates are cached in localStorage; cloud rows
  // live in Supabase and re-merge on load.
  const persist = (next: ChartTemplate[]) => {
    setTemplates(next);
    try { localStorage.setItem(KEY, JSON.stringify(next.filter((t) => !t.cloudId))); } catch { /* ignore */ }
  };

  const saveCurrent = () => {
    const nm = name.trim() || `${activeSymbol} ${activeTimeframe}`;
    const t: ChartTemplate = {
      id: `${Date.now()}-${templates.length}`,
      name: nm,
      symbol: activeSymbol,
      timeframe: activeTimeframe,
      chartType: raptorChartType,
      indicators: [...raptorIndicators],
      createdAt: Date.now(),
    };
    persist([t, ...templates]);
    setName('');
    // Signed in → also sync to the account (cloud). Fire-and-forget with
    // an honest toast either way.
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { onToast(`Template saved locally: ${nm}`); return; }
        const { data, error } = await supabase
          .from('chart_templates')
          .insert({ user_id: user.id, name: nm, symbol: t.symbol, timeframe: t.timeframe, chart_type: t.chartType, indicators: t.indicators })
          .select('id')
          .single();
        if (error || !data) { onToast(`Template saved locally: ${nm} (cloud sync failed)`); return; }
        setTemplates((prev) => {
          const next = prev.map((x) => (x.id === t.id ? { ...x, cloudId: data.id as string, id: `cloud-${data.id}` } : x));
          try { localStorage.setItem(KEY, JSON.stringify(next.filter((x) => !x.cloudId))); } catch { /* ignore */ }
          return next;
        });
        onToast(`Template saved to your account: ${nm}`);
      } catch { onToast(`Template saved locally: ${nm}`); }
    })();
  };

  const apply = (t: ChartTemplate) => {
    setActiveSymbol(t.symbol);
    setActiveTimeframe(t.timeframe);
    try {
      window.dispatchEvent(new CustomEvent('raptor-timeframe-change', { detail: t.timeframe }));
      window.dispatchEvent(new CustomEvent('raptor-apply-template', { detail: { chartType: t.chartType, indicators: t.indicators } }));
    } catch { /* ignore */ }
    onToast(`Template loaded: ${t.name} (${t.symbol} · ${t.timeframe})`);
    setOpen(false);
  };

  const remove = (id: string) => {
    const t = templates.find((x) => x.id === id);
    persist(templates.filter((x) => x.id !== id));
    if (t?.cloudId) {
      (async () => {
        try { await createClient().from('chart_templates').delete().eq('id', t.cloudId); }
        catch { /* row stays in cloud; re-merges next load */ }
      })();
    }
  };

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Chart templates & layouts"
        className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
        style={headerBtnStyle('templates', open)}
      >
        <LayoutTemplate size={12} /> <span className="hidden 2xl:inline">Templates</span> <ChevronDown size={10} />
      </button>
      <HeaderPortal open={open} anchorRef={ref}>
        <div className="w-[300px] rounded-lg border shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}>
          {/* Save current */}
          <div className="border-b p-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/35">
              <span>Save current view</span>
              <span className="flex items-center gap-1 normal-case" style={{ color: signedIn ? '#0091D5' : 'rgba(255,255,255,0.25)' }}>
                <Cloud size={10} /> {signedIn ? 'syncs to account' : 'local only'}
              </span>
            </div>
            <div className="mb-2 flex items-center gap-2 text-[10px] text-white/50">
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-white/70">{activeSymbol}</span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-white/70">{activeTimeframe}</span>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-white/70 capitalize">{raptorChartType}</span>
              <span className="text-white/35">{raptorIndicators.length} ind.</span>
            </div>
            <div className="flex gap-1.5">
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveCurrent(); }}
                placeholder="Template name (optional)"
                className="flex-1 rounded bg-white/[0.06] px-2 py-1 text-[11px] text-white placeholder:text-white/25 outline-none" />
              <button onClick={saveCurrent} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}>
                <Plus size={11} /> Save
              </button>
            </div>
          </div>

          {/* Saved templates */}
          <div className="max-h-[260px] overflow-y-auto">
            {templates.length === 0 && (
              <div className="px-3 py-4 text-center text-[10px] text-white/30">
                No templates yet. Set your symbol, timeframe, chart type and indicators, then Save.
              </div>
            )}
            {templates.map((t) => {
              const isCurrent = t.symbol === activeSymbol && t.timeframe === activeTimeframe;
              return (
                <div key={t.id} className="group flex items-center gap-2 border-t px-3 py-2 hover:bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11px] font-semibold text-white">{t.name}</span>
                      {t.cloudId && <Cloud size={10} className="shrink-0 text-[#0091D5]" aria-label="Synced to your account" />}
                      {isCurrent && <Check size={10} className="shrink-0 text-[#00C27A]" />}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-white/40">
                      <span className="font-mono">{t.symbol}</span>·<span className="font-mono">{t.timeframe}</span>·
                      <span className="capitalize">{t.chartType}</span>·<span>{t.indicators.length} ind.</span>
                    </div>
                  </div>
                  <button onClick={() => apply(t)} className="shrink-0 rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wide transition-colors"
                    style={{ backgroundColor: 'rgba(0,194,122,0.15)', color: '#00C27A', border: '1px solid rgba(0,194,122,0.3)' }}>
                    <Download size={10} className="mr-0.5 inline" />Load
                  </button>
                  <button onClick={() => remove(t.id)} className="shrink-0 text-white/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400">
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </HeaderPortal>
    </div>
  );
}
