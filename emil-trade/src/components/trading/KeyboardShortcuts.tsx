'use client';

import { X } from 'lucide-react';

interface KeyboardShortcutsProps {
  onClose: () => void;
}

const shortcuts = [
  { key: 'B', description: 'Set order direction to BUY' },
  { key: 'S', description: 'Set order direction to SELL' },
  { key: 'Esc', description: 'Close modal / panel' },
  { key: '1', description: 'Switch to 1m timeframe' },
  { key: '2', description: 'Switch to 5m timeframe' },
  { key: '3', description: 'Switch to 15m timeframe' },
  { key: '4', description: 'Switch to 1H timeframe' },
  { key: '5', description: 'Switch to 4H timeframe' },
  { key: '6', description: 'Switch to 1D timeframe' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'F11', description: 'Toggle fullscreen' },
];

export default function KeyboardShortcuts({ onClose }: KeyboardShortcutsProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-2xl w-[400px] max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: '#111118',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#0091D5' }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-70 transition-opacity"
          >
            <X size={16} className="opacity-50" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 flex flex-col gap-1">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between px-3 py-2 rounded"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <span className="text-xs opacity-60">{s.description}</span>
              <kbd
                className="text-[11px] font-mono font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#0091D5',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 text-[10px] opacity-30 text-center"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          Shortcuts are active when no input field is focused
        </div>
      </div>
    </div>
  );
}
