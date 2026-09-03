'use client';

// BottomDock — a drag-resizable bottom panel for the standalone windows
// (Scan & Trade, Hedge & Trade, EMIL). Same grip-dot dragger pattern as the
// main terminal's chart/positions divider.

import { useCallback, useEffect, useRef, useState } from 'react';

export default function BottomDock({ children, initialHeight = 220 }: { children: React.ReactNode; initialHeight?: number }) {
  const [height, setHeight] = useState(initialHeight);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(initialHeight);
  // See terminal page: a capture overlay keeps mousemove flowing to the parent
  // while dragging over any TradingView iframe below.
  const [isDragging, setIsDragging] = useState(false);

  const onDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    setIsDragging(true);
    startY.current = e.clientY;
    startH.current = height;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [height]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      setHeight(Math.max(80, Math.min(600, startH.current + (startY.current - e.clientY))));
    };
    const up = () => {
      if (dragging.current) {
        dragging.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  return (
    <>
      {isDragging && <div style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'row-resize' }} />}
      {/* Dragger — deliberately prominent so it's never missed */}
      <div onMouseDown={onDown} className="group relative shrink-0" title="Drag up/down to resize this panel"
        style={{ height: 12, cursor: 'row-resize', zIndex: 50 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,145,213,0.22) 50%, rgba(255,255,255,0.02) 100%)',
          borderTop: '1px solid rgba(0,145,213,0.45)', borderBottom: '1px solid rgba(0,145,213,0.45)',
        }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'rgba(41,171,226,0.75)', boxShadow: '0 0 4px rgba(41,171,226,0.6)' }} />
            ))}
            <span className="ml-2 font-mono text-[8px] font-bold uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100" style={{ color: '#29ABE2' }}>
              ⇕ drag to resize
            </span>
          </div>
        </div>
      </div>
      <div className="shrink-0 overflow-auto" style={{ height }}>
        {children}
      </div>
    </>
  );
}
