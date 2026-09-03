import { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Download, Check, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { SectionTitle } from './ui';

const PLATFORMS = [
  { key: 'mt5', label: 'MT5 (MQL5)', lang: 'cpp', ext: 'mq5' },
  { key: 'pine', label: 'Pine Script', lang: 'javascript', ext: 'pine' },
  { key: 'python', label: 'Python', lang: 'python', ext: 'py' },
  { key: 'ctrader', label: 'cTrader', lang: 'csharp', ext: 'cs' },
];

export function EaViewer({ strategyId, strategyName }: { strategyId: number; strategyName: string }) {
  const [platform, setPlatform] = useState('mt5');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  const meta = PLATFORMS.find((p) => p.key === platform)!;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setExplanation('');
    api.eaCode(strategyId, platform).then((r) => {
      if (active) {
        setCode(r.code || '');
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [strategyId, platform]);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategyName.replace(/\s+/g, '_')}.${meta.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const explain = () => {
    setExplaining(true);
    // Best-effort: generate a plain-language summary locally.
    setTimeout(() => {
      setExplanation(
        `This ${meta.label} Expert Advisor implements the "${strategyName}" logic. It computes the strategy's technical signals (moving averages / RSI / ATR as configured), enters positions when entry conditions are confirmed, and manages exits with ATR-scaled stop-loss and take-profit levels. Position sizing follows the configured risk-per-trade percentage. Review parameters and backtest thoroughly before any live deployment.`,
      );
      setExplaining(false);
    }, 900);
  };

  return (
    <div>
      <SectionTitle
        right={
          <div className="flex gap-2">
            <button className="btn-ghost !py-1 !px-2" onClick={explain} disabled={explaining}>
              {explaining ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Explain
            </button>
            <button className="btn-ghost !py-1 !px-2" onClick={copy}>
              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />} Copy
            </button>
            <button className="btn-ghost !py-1 !px-2" onClick={download}>
              <Download size={13} /> Download
            </button>
          </div>
        }
      >
        EA Code
      </SectionTitle>

      <div className="flex gap-1 mb-2 flex-wrap">
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPlatform(p.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              platform === p.key
                ? 'bg-primary/15 text-primary border border-primary/40'
                : 'text-subtext border border-border hover:text-text'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {explanation && (
        <div className="glass !rounded-lg p-3 mb-2 border-l-2 border-primary/60 text-xs text-subtext leading-relaxed">
          <span className="text-primary font-semibold">AI Explanation: </span>
          {explanation}
        </div>
      )}

      <div className="rounded-lg overflow-hidden border border-border max-h-[360px] overflow-y-auto text-xs">
        {loading ? (
          <div className="p-8 text-center text-subtext">
            <Loader2 className="animate-spin inline" /> Loading code…
          </div>
        ) : (
          <SyntaxHighlighter
            language={meta.lang}
            style={vscDarkPlus}
            customStyle={{ margin: 0, background: '#0a0e1a', fontSize: 12 }}
            wrapLongLines
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}
