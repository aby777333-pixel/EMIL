'use client';

// Portals a shared-header pop-down to <body>. The header row scrolls
// horizontally (mobile no-clip fix bf24662), so an absolutely-positioned panel
// inside it is clipped to the row's ~30px height and never visible. Fixed
// positioning at body level keeps every menu fully visible over both charts.
//
// The wrapper stops mousedown propagation so each menu's document-level
// outside-click close handler doesn't fire for clicks inside the panel
// (the panel no longer lives inside the menu's anchor ref).

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function HeaderPortal({
  anchorRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const place = () => {
      const a = anchorRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const pw = panelRef.current ? panelRef.current.getBoundingClientRect().width : 0;
      // Right-align the panel to its anchor, clamped inside the viewport.
      const left = Math.max(4, Math.min(r.right - pw, window.innerWidth - pw - 4));
      setPos({ top: r.bottom + 4, left });
    };
    place();
    const raf = requestAnimationFrame(place); // re-place once the panel has real width
    window.addEventListener('resize', place);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', place); };
  }, [open, anchorRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 9999, maxWidth: 'calc(100vw - 8px)', overflowX: 'auto' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
