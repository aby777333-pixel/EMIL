'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import TopBar from '@/components/layout/TopBar';
import Watchlist from '@/components/trading/watchlist/Watchlist';
import ChartSourceSwitcher from '@/components/trading/chart/ChartSourceSwitcher';
import PositionsPanel from '@/components/trading/positions/PositionsPanel';
import AccountBar from '@/components/trading/account-summary/AccountBar';
import RightPanel from '@/components/trading/RightPanel';
import KeyboardShortcuts from '@/components/trading/KeyboardShortcuts';
import TermsGateModal from '@/components/trading/TermsGateModal';
import dynamic from 'next/dynamic';
import { loadWorkspacePrefs, applyWorkspacePrefs } from '@/lib/insights/workspace';

// Command palette (§30) — lazy: costs nothing until Ctrl/Cmd+K.
const CommandPalette = dynamic(() => import('@/components/trading/CommandPalette'), { ssr: false });
import { usePriceEngine } from '@/hooks/usePriceEngine';
import { useTradingStore } from '@/stores/trading';

const TF_MAP: Record<string, string> = {
  '1': '1m',
  '2': '5m',
  '3': '15m',
  '4': '1H',
  '5': '4H',
  '6': '1D',
};

export default function TerminalPage() {
  const { ohlcvBuilder, isLiveData } = usePriceEngine();
  const { setOrderDirection } = useTradingStore();
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Right panel prices come from the RAPTOR feed — hide it while the
  // TradingView (real data) chart is displayed to avoid mismatched quotes.
  const [chartSource, setChartSource] = useState<'tradingview' | 'raptor'>('tradingview');

  // Collapsible right panel: hidden state persists; a pulsing light at the
  // right edge brings it back.
  const [rightHidden, setRightHidden] = useState(false);
  useEffect(() => {
    try { setRightHidden(localStorage.getItem('raptor_right_panel_hidden') === '1'); } catch { /* default shown */ }
    // §35 workspace prefs: UI scale + high contrast, applied on load and
    // removed again when leaving the terminal.
    try { applyWorkspacePrefs(loadWorkspacePrefs()); } catch { /* stock look */ }
    return () => { applyWorkspacePrefs({ scale: 1, highContrast: false }); };
  }, []);
  const toggleRightPanel = useCallback((hide: boolean) => {
    setRightHidden(hide);
    try { localStorage.setItem('raptor_right_panel_hidden', hide ? '1' : '0'); } catch { /* ignore */ }
  }, []);

  // Command palette (§30): Ctrl/Cmd+K opens; palette commands can also
  // toggle the right panel via this event.
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onToggleRight = () => {
      setRightHidden((prev) => {
        const next = !prev;
        try { localStorage.setItem('raptor_right_panel_hidden', next ? '1' : '0'); } catch { /* ignore */ }
        return next;
      });
    };
    window.addEventListener('raptor-toggle-right-panel', onToggleRight);
    return () => window.removeEventListener('raptor-toggle-right-panel', onToggleRight);
  }, []);

  // ── Resizable positions panel (height persisted for layout recovery §35) ──
  const [panelHeight, setPanelHeight] = useState(240);
  useEffect(() => {
    try {
      const h = parseInt(localStorage.getItem('raptor_positions_panel_height') || '', 10);
      if (h >= 100 && h <= 600) setPanelHeight(h);
    } catch { /* default */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem('raptor_positions_panel_height', String(panelHeight)); } catch { /* ignore */ }
  }, [panelHeight]);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(240);
  // A drag-capture overlay renders above the chart's TradingView iframe while
  // resizing — without it, once the cursor enters the iframe the parent window
  // stops receiving mousemove and the divider freezes.
  const [dragging, setDragging] = useState(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    setDragging(true);
    startY.current = e.clientY;
    startHeight.current = panelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [panelHeight]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const newHeight = Math.max(100, Math.min(600, startHeight.current + delta));
      setPanelHeight(newHeight);
    };
    const handleUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        setDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl/Cmd+K opens the command palette even from inside inputs.
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key;

      if (key === 'b' || key === 'B') { e.preventDefault(); setOrderDirection('BUY'); return; }
      if (key === 's' || key === 'S') { e.preventDefault(); setOrderDirection('SELL'); return; }
      if (key === 'Escape') { setShowShortcuts(false); return; }
      if (key === '?') { e.preventDefault(); setShowShortcuts((prev) => !prev); return; }
      if (TF_MAP[key]) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('raptor-timeframe-change', { detail: TF_MAP[key] }));
        return;
      }
      if (key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
        else { document.documentElement.requestFullscreen().catch(() => {}); }
        return;
      }
    },
    [setOrderDirection]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bg-primary)] flex flex-col">
      {/* Drag-capture overlay — keeps mousemove flowing to the parent while
          resizing over the TradingView chart iframe. */}
      {dragging && <div style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'row-resize' }} />}
      {/* TopBar */}
      <div className="border-b border-[var(--border)] shrink-0">
        <TopBar />
      </div>

      {/* Main content - responsive grid */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateRows: `1fr auto ${panelHeight}px 30px`,
          gridTemplateColumns: '240px 1fr',
        }}
      >
        {/* Watchlist - left sidebar (hidden on mobile) */}
        <div className="border-r border-[var(--border)] overflow-hidden hidden lg:block">
          <Watchlist />
        </div>

        {/* ChartPanel - center. The Order/Account/Tools panel rides INSIDE the
            switcher (beside the chart, BELOW the shared header + timeframe
            rows) so the header buttons — DOM, Script, EAs — are never masked
            when the panel is expanded. Collapsible — the red handle hides it;
            the pulsing red light restores it. */}
        <div className="overflow-hidden" style={{ gridColumn: 'span 1' }}>
          <ChartSourceSwitcher
            ohlcvBuilder={ohlcvBuilder}
            isLiveData={isLiveData}
            onSourceChange={setChartSource}
            sidePanel={chartSource !== 'tradingview' && !rightHidden ? (
              <div className="relative shrink-0 border-l border-[var(--border)] hidden xl:block" style={{ width: 280 }}>
                {/* Collapse handle — hangs OVER the chart edge (left of the
                    panel border) so it never covers the ticket's controls. */}
                <button
                  onClick={() => toggleRightPanel(true)}
                  title="Hide panel — the pulsing red light at the right edge brings it back"
                  className="absolute top-1/2 z-40 flex -translate-y-1/2 items-center justify-center rounded-l-lg transition-all hover:brightness-125"
                  style={{
                    left: -26, width: 26, height: 96,
                    background: 'linear-gradient(180deg, rgba(255,82,82,0.4) 0%, rgba(255,82,82,0.15) 100%)',
                    border: '1px solid rgba(255,82,82,0.7)', borderRight: 'none',
                    color: '#FF5252', fontSize: 18, fontWeight: 700,
                    boxShadow: '0 0 16px rgba(255,82,82,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
                    textShadow: '0 0 8px rgba(255,82,82,0.9)',
                  }}
                >
                  <span className="absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 animate-ping rounded-full" style={{ backgroundColor: '#FF5252' }} />
                  <span className="animate-pulse">›</span>
                </button>
                <RightPanel />
              </div>
            ) : null}
          />
        </div>

        {/* ── Drag handle ── */}
        <div
          onMouseDown={handleDragStart}
          style={{ gridColumn: '1 / -1', height: 6, cursor: 'row-resize', position: 'relative', zIndex: 50 }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,145,213,0.08) 50%, rgba(255,255,255,0.02) 100%)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, rgba(0,145,213,0.1) 0%, rgba(0,145,213,0.25) 50%, rgba(0,145,213,0.1) 100%)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,145,213,0.08) 50%, rgba(255,255,255,0.02) 100%)'; }}
          >
            {/* Grip dots */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              gap: 3,
            }}>
              {[0,1,2,3,4].map((i) => (
                <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)' }} />
              ))}
            </div>
          </div>
        </div>

        {/* PositionsPanel - spans full width */}
        <div className="overflow-auto" style={{ gridColumn: '1 / -1' }}>
          <PositionsPanel />
        </div>

        {/* AccountBar - spans full width */}
        <div className="border-t border-[var(--border)] overflow-hidden" style={{ gridColumn: '1 / -1' }}>
          <AccountBar />
        </div>
      </div>

      {/* Command palette (§30) — Ctrl/Cmd+K */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}

      {/* Blinking restore light — appears only while the right panel is
          hidden on the RAPTOR tab; clicking brings the panel back. */}
      {chartSource !== 'tradingview' && rightHidden && (
        <button
          onClick={() => toggleRightPanel(false)}
          title="Show Order / Account / Tools panel"
          className="fixed right-2 top-1/2 z-[60] hidden -translate-y-1/2 items-center justify-center xl:flex"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            backgroundColor: 'rgba(10,15,26,0.92)',
            border: '2px solid rgba(255,82,82,0.8)',
            boxShadow: '0 0 22px rgba(255,82,82,0.75), 0 0 6px rgba(255,82,82,0.9), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <span className="absolute h-5 w-5 animate-ping rounded-full" style={{ backgroundColor: 'rgba(255,82,82,0.8)' }} />
          <span className="absolute h-8 w-8 animate-ping rounded-full" style={{ backgroundColor: 'rgba(255,82,82,0.25)', animationDelay: '0.4s' }} />
          <span className="relative h-4 w-4 animate-pulse rounded-full" style={{ backgroundColor: '#FF5252', boxShadow: '0 0 10px rgba(255,82,82,1)' }} />
        </button>
      )}

      {/* Mobile-only: make chart take full width */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1023px) {
          [style*="grid-template-columns: 240px"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 1024px) and (max-width: 1279px) {
          [style*="grid-template-columns: 240px"] {
            grid-template-columns: 200px 1fr !important;
          }
        }
      `}} />

      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />
      )}

      {/* Platform terms & risk acknowledgement — blocks until accepted */}
      <TermsGateModal />
    </div>
  );
}
