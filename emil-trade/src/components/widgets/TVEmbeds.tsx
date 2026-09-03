'use client';

// TradingView widget hosts for the terminal:
// - TVWidget: classic embed scripts (s3.tradingview.com/external-embedding)
// - TVElement: new web-component widgets (widgets.tradingview-widget.com)

import { useEffect, useMemo, useRef } from 'react';

export function TVWidget({
  widget,
  config,
  height,
}: {
  widget: string;
  config: Record<string, unknown>;
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const configJson = useMemo(() => JSON.stringify(config), [config]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';

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
    script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widget}.js`;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = configJson;
    container.appendChild(script);

    host.appendChild(container);
    return () => {
      host.innerHTML = '';
    };
  }, [widget, configJson]);

  return <div ref={hostRef} style={{ width: '100%', ...(height ? { height } : {}) }} />;
}

export function TVElement({
  tag,
  attrs,
  minHeight,
}: {
  tag: string;
  attrs?: Record<string, string | boolean>;
  minHeight?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const attrsJson = useMemo(() => JSON.stringify(attrs ?? {}), [attrs]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scriptId = `tv-wc-${tag}`;
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = `https://widgets.tradingview-widget.com/w/en/${tag}.js`;
      script.id = scriptId;
      document.head.appendChild(script);
    }

    const el = document.createElement(tag);
    const parsed = JSON.parse(attrsJson) as Record<string, string | boolean>;
    for (const [key, value] of Object.entries(parsed)) {
      if (value === true) el.setAttribute(key, '');
      else if (value !== false) el.setAttribute(key, String(value));
    }
    host.innerHTML = '';
    host.appendChild(el);
    return () => {
      host.innerHTML = '';
    };
  }, [tag, attrsJson]);

  return <div ref={hostRef} style={{ width: '100%', ...(minHeight ? { minHeight } : {}) }} />;
}
