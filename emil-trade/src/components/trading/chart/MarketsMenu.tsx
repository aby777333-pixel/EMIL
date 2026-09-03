'use client';

import HeaderPortal from './HeaderPortal';
import { headerBtnStyle } from './header-theme';

// Markets data hub (super-prompt §14–17): Economic Calendar, Market News and a
// multi-asset Screener — all real data via TradingView's free embed widgets (no
// API keys). Rendered as an integrated shared-header dropdown (not a disconnected
// screen), so it's available alongside both chart tabs.

import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Newspaper, LayoutGrid, ChevronDown, Radar } from 'lucide-react';

type Tab = 'calendar' | 'news' | 'screener';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={12} /> },
  { id: 'news', label: 'News', icon: <Newspaper size={12} /> },
  { id: 'screener', label: 'Screener', icon: <LayoutGrid size={12} /> },
];

function widgetConfig(tab: Tab): { src: string; config: Record<string, unknown> } {
  const common = { colorTheme: 'dark', isTransparent: true, locale: 'en', width: '100%', height: '100%' };
  if (tab === 'calendar') {
    return {
      src: 'https://s3.tradingview.com/external-embedding/embed-widget-events.js',
      config: { ...common, importanceFilter: '0,1', countryFilter: 'us,eu,gb,jp,ca,au,ch,cn,in' },
    };
  }
  if (tab === 'news') {
    return {
      src: 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js',
      config: { ...common, feedMode: 'all_symbols', displayMode: 'regular' },
    };
  }
  return {
    src: 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js',
    config: { ...common, market: 'forex', showToolbar: true, defaultColumn: 'overview', defaultScreen: 'general' },
  };
}

export default function MarketsMenu() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('calendar');
  const ref = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // (Re)mount the TradingView widget for the current tab whenever the panel is
  // open or the tab changes.
  useEffect(() => {
    if (!open) return;
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';
    const { src, config } = widgetConfig(tab);
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    container.style.width = '100%';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);
    const script = document.createElement('script');
    script.src = src;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);
    host.appendChild(container);
    return () => { host.innerHTML = ''; };
  }, [open, tab]);

  return (
    <div className="relative ml-1" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Markets — calendar, news & screener"
        className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[11px] transition-all"
        style={headerBtnStyle('markets', open)}
      >
        <Radar size={12} /> <span className="hidden 2xl:inline">Markets</span> <ChevronDown size={10} />
      </button>
      <HeaderPortal open={open} anchorRef={ref}>
        <div className="flex h-[560px] w-[min(1080px,96vw)] flex-col overflow-hidden rounded-lg border shadow-2xl" style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex shrink-0 gap-0.5 border-b p-1.5" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-[11px] font-semibold transition-colors"
                style={{ backgroundColor: tab === t.id ? 'rgba(41,171,226,0.15)' : 'transparent', color: tab === t.id ? '#0091D5' : 'rgba(255,255,255,0.5)' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div ref={hostRef} className="min-h-0 flex-1" />
          <div className="shrink-0 border-t px-2 py-1 text-[8px] uppercase tracking-wide text-white/25" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            Live market data
          </div>
        </div>
      </HeaderPortal>
    </div>
  );
}
