'use client';

import { useEffect, useCallback } from 'react';

// ================================================================
// HotkeyOverlay -- centered overlay modal showing all dealer hotkeys
// ================================================================

interface HotkeyOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const HOTKEYS: { key: string; description: string }[] = [
  { key: 'F1', description: 'Accept order at market' },
  { key: 'F2', description: 'Open requote panel' },
  { key: 'F3', description: 'Set delay' },
  { key: 'F4', description: 'Reject order' },
  { key: 'F5', description: 'Force close' },
  { key: '\u2191 / \u2193', description: 'Navigate order queue' },
  { key: 'Enter', description: 'Load selected order' },
  { key: 'Escape', description: 'Clear console / close modals' },
  { key: 'Ctrl+B', description: 'Toggle A/B book' },
  { key: 'Ctrl+E', description: 'Toggle Expert Mode' },
  { key: 'Ctrl+N', description: 'Open NEXUS panel' },
  { key: 'Ctrl+L', description: 'Toggle blotter' },
  { key: 'Ctrl+F', description: 'Emergency flatten' },
  { key: '?', description: 'Show/hide this reference' },
];

export default function HotkeyOverlay({ isOpen, onClose }: HotkeyOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.70)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 600,
          maxHeight: '80vh',
          background: '#111116',
          border: '1px solid #252530',
          borderRadius: 10,
          padding: '24px 28px',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#F2F2F2',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          EMIL TRADE DEALER HOTKEYS
        </div>

        {/* Hotkey Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <tbody>
            {HOTKEYS.map((hk) => (
              <tr
                key={hk.key}
                style={{
                  borderBottom: '1px solid #1A1A22',
                }}
              >
                <td
                  style={{
                    padding: '8px 12px',
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#00B4D8',
                    width: 120,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {hk.key}
                </td>
                <td
                  style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#888899',
                  }}
                >
                  {hk.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div
          style={{
            marginTop: 16,
            textAlign: 'center',
            fontSize: 11,
            color: '#555566',
          }}
        >
          Press <span style={{ color: '#00B4D8', fontFamily: 'monospace' }}>Escape</span> or click
          outside to close
        </div>
      </div>
    </div>
  );
}
