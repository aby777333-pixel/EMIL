'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, FileCode, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';

interface CodeDiffProps {
  originalCode: string;
  convertedCode: string;
  originalLabel?: string;
  convertedLabel?: string;
  language?: string;
}

export function CodeDiff({
  originalCode,
  convertedCode,
  originalLabel = 'MQL5 Original',
  convertedLabel = 'EMIL TRADE TypeScript',
}: CodeDiffProps) {
  const [copied, setCopied] = useState<'original' | 'converted' | null>(null);
  const [expanded, setExpanded] = useState(false);

  const copyCode = async (code: string, side: 'original' | 'converted') => {
    await navigator.clipboard.writeText(code);
    setCopied(side);
    setTimeout(() => setCopied(null), 2000);
  };

  const maxHeight = expanded ? 'max-h-[80vh]' : 'max-h-[500px]';

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#0a0c10]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06]">
        <span className="text-sm font-medium text-white/60">Side-by-Side Comparison</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* Panels */}
      <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
        {/* Original MQL5 */}
        <div>
          <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
            <span className="flex items-center gap-2 text-xs text-white/40">
              <FileCode className="h-3.5 w-3.5 text-[#f59e0b]" />
              {originalLabel}
            </span>
            <button
              onClick={() => copyCode(originalCode, 'original')}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              {copied === 'original' ? <Check className="h-3 w-3 text-[#00dc82]" /> : <Copy className="h-3 w-3" />}
              {copied === 'original' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className={`${maxHeight} overflow-auto`}>
            <pre className="p-4 text-xs leading-5 font-mono text-white/70 whitespace-pre-wrap break-words">
              {originalCode || '// No source code available'}
            </pre>
          </div>
        </div>

        {/* Converted TypeScript */}
        <div>
          <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
            <span className="flex items-center gap-2 text-xs text-white/40">
              <Code2 className="h-3.5 w-3.5 text-[#00b4ff]" />
              {convertedLabel}
            </span>
            <button
              onClick={() => copyCode(convertedCode, 'converted')}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              {copied === 'converted' ? <Check className="h-3 w-3 text-[#00dc82]" /> : <Copy className="h-3 w-3" />}
              {copied === 'converted' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className={`${maxHeight} overflow-auto`}>
            <pre className="p-4 text-xs leading-5 font-mono text-[#00b4ff]/80 whitespace-pre-wrap break-words">
              {convertedCode || '// Conversion output will appear here'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tabbed Code Viewer for multiple outputs ─────────────

interface CodeTabsProps {
  tabs: { label: string; code: string; language: string }[];
}

export function CodeTabs({ tabs }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(tabs[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#0a0c10]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`
                px-4 py-2.5 text-xs font-medium transition-colors relative
                ${activeTab === i ? 'text-[#00b4ff]' : 'text-white/40 hover:text-white/60'}
              `}
            >
              {tab.label}
              {activeTab === i && (
                <motion.div
                  layoutId="codeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00b4ff]"
                />
              )}
            </button>
          ))}
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1 px-3 py-1.5 mr-2 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-[#00dc82]" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="max-h-[500px] overflow-auto">
        <pre className="p-4 text-xs leading-5 font-mono text-white/70 whitespace-pre-wrap break-words">
          {tabs[activeTab].code}
        </pre>
      </div>
    </div>
  );
}
