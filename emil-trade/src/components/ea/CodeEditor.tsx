'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Copy, Download, Upload, RotateCcw } from 'lucide-react';

const DEFAULT_CODE = `// EMA Crossover Strategy - RAPTOR Script
// Buys when fast EMA crosses above slow EMA
// Sells when fast EMA crosses below slow EMA

const FAST_PERIOD = 9;
const SLOW_PERIOD = 21;
const LOT_SIZE = 0.1;
const STOP_LOSS_PIPS = 20;
const TAKE_PROFIT_PIPS = 40;

function onBar(ctx) {
  const fast = ctx.ema(ctx.close, FAST_PERIOD);
  const slow = ctx.ema(ctx.close, SLOW_PERIOD);
  const prevFast = ctx.ema(ctx.close, FAST_PERIOD, 1);
  const prevSlow = ctx.ema(ctx.close, SLOW_PERIOD, 1);

  // Bullish crossover
  if (prevFast < prevSlow && fast > slow) {
    ctx.closeAll('SELL');
    ctx.buy({
      size: LOT_SIZE,
      sl: STOP_LOSS_PIPS,
      tp: TAKE_PROFIT_PIPS,
      comment: 'EMA Cross BUY'
    });
  }

  // Bearish crossover
  if (prevFast > prevSlow && fast < slow) {
    ctx.closeAll('BUY');
    ctx.sell({
      size: LOT_SIZE,
      sl: STOP_LOSS_PIPS,
      tp: TAKE_PROFIT_PIPS,
      comment: 'EMA Cross SELL'
    });
  }
}`;

const KEYWORDS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'break', 'continue', 'switch', 'case', 'default', 'new', 'this', 'true', 'false',
  'null', 'undefined', 'typeof', 'instanceof', 'class', 'export', 'import', 'from',
  'async', 'await', 'try', 'catch', 'throw', 'finally',
];

function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < line.length) {
    // Comments
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push(
        <span key={key++} style={{ color: '#546E7A' }}>
          {line.slice(i)}
        </span>
      );
      return tokens;
    }

    // Strings (single or double quotes)
    if (line[i] === "'" || line[i] === '"') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++;
        j++;
      }
      j++; // include closing quote
      tokens.push(
        <span key={key++} style={{ color: '#C3E88D' }}>
          {line.slice(i, j)}
        </span>
      );
      i = j;
      continue;
    }

    // Numbers
    if (/\d/.test(line[i]) && (i === 0 || /[\s(,=<>!+\-*/;{[]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[\d.]/.test(line[j])) j++;
      tokens.push(
        <span key={key++} style={{ color: '#F78C6C' }}>
          {line.slice(i, j)}
        </span>
      );
      i = j;
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);

      if (KEYWORDS.includes(word)) {
        tokens.push(
          <span key={key++} style={{ color: '#C792EA' }}>
            {word}
          </span>
        );
      } else if (j < line.length && line[j] === '(') {
        // Function call
        tokens.push(
          <span key={key++} style={{ color: '#82AAFF' }}>
            {word}
          </span>
        );
      } else {
        tokens.push(
          <span key={key++} style={{ color: '#EEFFFF' }}>
            {word}
          </span>
        );
      }
      i = j;
      continue;
    }

    // Operators and punctuation
    tokens.push(
      <span key={key++} style={{ color: '#89DDFF' }}>
        {line[i]}
      </span>
    );
    i++;
  }

  return tokens;
}

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

export default function CodeEditor({ code, onChange }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const lines = useMemo(() => code.split('\n'), [code]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newCode = code.substring(0, start) + '  ' + code.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    [code, onChange]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
  }, [code]);

  const handleReset = useCallback(() => {
    onChange(DEFAULT_CODE);
  }, [onChange]);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#060D16' }}>
      {/* File tab bar */}
      <div
        className="flex items-center justify-between px-2 border-b shrink-0"
        style={{
          height: 32,
          backgroundColor: '#0D0D14',
          borderColor: '#1E1E2E',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1 text-[11px] rounded-t"
            style={{
              backgroundColor: '#060D16',
              color: '#0091D5',
              borderTop: '2px solid #0091D5',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0091D5" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            strategy.nsx
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Copy code"
          >
            <Copy size={12} className="opacity-50 hover:opacity-100" />
          </button>
          <button
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Import file"
          >
            <Upload size={12} className="opacity-50 hover:opacity-100" />
          </button>
          <button
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Export file"
          >
            <Download size={12} className="opacity-50 hover:opacity-100" />
          </button>
          <button
            onClick={handleReset}
            className="p-1 rounded hover:bg-white/5 transition-colors"
            title="Reset to default"
          >
            <RotateCcw size={12} className="opacity-50 hover:opacity-100" />
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Line numbers */}
        <div
          className="absolute left-0 top-0 bottom-0 select-none pointer-events-none z-10"
          style={{
            width: 48,
            backgroundColor: '#0D0D14',
            borderRight: '1px solid #1E1E2E',
          }}
        >
          <div
            style={{
              transform: `translateY(${-scrollTop}px)`,
              paddingTop: 12,
            }}
          >
            {lines.map((_, idx) => (
              <div
                key={idx}
                className="text-right pr-3 font-mono"
                style={{
                  height: 20,
                  lineHeight: '20px',
                  fontSize: 12,
                  color: '#4A4A5A',
                }}
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Syntax highlighted overlay */}
        <div
          className="absolute left-[48px] top-0 right-0 bottom-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="font-mono whitespace-pre"
            style={{
              transform: `translate(${-scrollLeft}px, ${-scrollTop}px)`,
              padding: '12px 16px',
              fontSize: 13,
              lineHeight: '20px',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          >
            {lines.map((line, idx) => (
              <div key={idx} style={{ height: 20 }}>
                {highlightLine(line)}
              </div>
            ))}
          </div>
        </div>

        {/* Actual textarea (transparent text for editing) */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="absolute inset-0 w-full h-full resize-none outline-none font-mono"
          style={{
            paddingLeft: 64,
            paddingTop: 12,
            paddingRight: 16,
            paddingBottom: 12,
            fontSize: 13,
            lineHeight: '20px',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            backgroundColor: 'transparent',
            color: 'transparent',
            caretColor: '#0091D5',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            tabSize: 2,
          }}
        />
      </div>

      {/* Status bar */}
      <div
        className="flex items-center justify-between px-3 text-[10px] font-mono shrink-0 border-t"
        style={{
          height: 24,
          backgroundColor: '#0D0D14',
          borderColor: '#1E1E2E',
          color: '#4A4A5A',
        }}
      >
        <span>RAPTOR Script (NSX)</span>
        <div className="flex items-center gap-3">
          <span>Lines: {lines.length}</span>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_CODE };
