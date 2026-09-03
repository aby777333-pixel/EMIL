import { useMemo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  MessageSquare, Blocks, FileCode2, Code2, Plus, Wand2, Copy, Check,
} from 'lucide-react';
import { Card, SectionTitle } from '../components/ui';
import { EaViewer } from '../components/EaViewer';
import { useStore } from '../store';

type View = 'nl' | 'visual' | 'pseudo' | 'code';

const BLOCK_LIBRARY = [
  'Market selection', 'Instrument', 'Timeframe', 'Indicator', 'Price condition',
  'Volume condition', 'Sentiment filter', 'Regime filter', 'Entry rule', 'Exit rule',
  'Position sizing', 'Stop-loss', 'Take-profit', 'Time filter', 'News filter',
  'Risk limit', 'Alert', 'Deploy action',
];

const DEFAULT_BLOCKS = [
  { type: 'Instrument', detail: 'EURUSD, BTCUSDT, NIFTY50' },
  { type: 'Timeframe', detail: '1H' },
  { type: 'Indicator', detail: 'EMA(50), EMA(200), RSI(14), ATR(14)' },
  { type: 'Entry rule', detail: 'EMA50 crosses above EMA200 AND RSI > 50' },
  { type: 'Exit rule', detail: 'EMA50 crosses below EMA200 OR RSI < 45' },
  { type: 'Stop-loss', detail: '1.5 × ATR' },
  { type: 'Take-profit', detail: '3.0 × ATR' },
  { type: 'Position sizing', detail: '1% risk per trade' },
  { type: 'Risk limit', detail: 'Max 5 open positions · daily loss cap $500' },
];

export default function Builder() {
  const [view, setView] = useState<View>('nl');
  const [name, setName] = useState('Trend Rider (multi-asset)');
  const [prompt, setPrompt] = useState(
    'Medium-risk trend-following strategy on EURUSD, gold, Bitcoin and NIFTY 50. Enter on EMA50/EMA200 crossover confirmed by RSI momentum. Risk 1% per trade with ATR-based stops. Avoid trading during high-impact news.',
  );
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const [copied, setCopied] = useState(false);
  const pushToast = useStore((s) => s.pushToast);

  const pseudocode = useMemo(() => genPseudocode(name, blocks), [name, blocks]);

  const addBlock = (type: string) =>
    setBlocks((b) => [...b, { type, detail: '…' }]);
  const removeBlock = (i: number) =>
    setBlocks((b) => b.filter((_, idx) => idx !== i));

  const copyPseudo = () => {
    navigator.clipboard.writeText(pseudocode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const views: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'nl', label: 'Natural language', icon: <MessageSquare size={13} /> },
    { key: 'visual', label: 'Visual flow', icon: <Blocks size={13} /> },
    { key: 'pseudo', label: 'Pseudocode', icon: <FileCode2 size={13} /> },
    { key: 'code', label: 'Platform code', icon: <Code2 size={13} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Strategy Builder</h2>
          <p className="text-sm text-subtext">
            One strategy, four views. Describe it, wire it visually, read the pseudocode, or export platform code.
          </p>
        </div>
        <input
          className="input !w-64"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Strategy name"
        />
      </div>

      {/* View tabs */}
      <div className="flex gap-1 flex-wrap">
        {views.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              view === v.key
                ? 'bg-primary/15 text-primary border border-primary/40'
                : 'text-subtext border border-border hover:text-text'
            }`}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {view === 'nl' && (
        <Card>
          <SectionTitle right={<Wand2 size={14} className="text-primary" />}>Describe your strategy</SectionTitle>
          <textarea
            className="input !h-40 font-mono text-xs leading-relaxed resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] text-subtext max-w-lg">
              The Strategy Generation agent turns this into indicators, entry/exit rules and risk settings — visible
              in the other tabs. Editing there updates this description where technically possible.
            </p>
            <button className="btn-primary" onClick={() => { setView('visual'); pushToast({ type: 'info', message: 'Parsed into 9 building blocks.' }); }}>
              <Wand2 size={14} /> Generate blocks
            </button>
          </div>
        </Card>
      )}

      {view === 'visual' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <SectionTitle>Block library</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {BLOCK_LIBRARY.map((b) => (
                <button
                  key={b}
                  onClick={() => addBlock(b)}
                  className="badge border border-border text-text/80 bg-bg hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus size={11} /> {b}
                </button>
              ))}
            </div>
          </Card>
          <Card className="lg:col-span-2">
            <SectionTitle right={<span className="text-[10px] text-subtext">{blocks.length} blocks</span>}>Strategy flow</SectionTitle>
            <div className="flex flex-col gap-2">
              {blocks.map((b, i) => (
                <div key={i} className="flex items-center gap-3 glass !rounded-lg p-2.5 border border-border">
                  <span className="font-mono text-[10px] text-subtext w-5">{i + 1}</span>
                  <span className="badge border border-primary/30 text-primary bg-primary/5 shrink-0">{b.type}</span>
                  <input
                    className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-primary/40"
                    value={b.detail}
                    onChange={(e) => setBlocks((bl) => bl.map((x, idx) => idx === i ? { ...x, detail: e.target.value } : x))}
                  />
                  <button className="text-subtext hover:text-danger text-xs" onClick={() => removeBlock(i)}>✕</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {view === 'pseudo' && (
        <Card>
          <SectionTitle right={
            <button className="btn-ghost !py-1 !px-2" onClick={copyPseudo}>
              {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />} Copy
            </button>
          }>Pseudocode</SectionTitle>
          <div className="rounded-lg overflow-hidden border border-border text-xs">
            <SyntaxHighlighter language="text" style={vscDarkPlus} customStyle={{ margin: 0, background: '#0a0e1a', fontSize: 12 }} wrapLongLines>
              {pseudocode}
            </SyntaxHighlighter>
          </div>
        </Card>
      )}

      {view === 'code' && (
        <Card>
          <EaViewer strategyId={1} strategyName={name} />
          <p className="text-[11px] text-subtext mt-3 border-t border-border/50 pt-3">
            ⚠️ Generated code is validated before deployment (syntax, order logic, symbol mapping, lot/tick sizes,
            duplicate-order guards). The lab warns when a feature can't be reproduced exactly on another platform.
            Any code or parameter change creates a new version requiring fresh approval.
          </p>
        </Card>
      )}
    </div>
  );
}

function genPseudocode(name: string, blocks: { type: string; detail: string }[]): string {
  const find = (t: string) => blocks.find((b) => b.type === t)?.detail || '';
  return [
    `STRATEGY "${name}"`,
    `  UNIVERSE     ${find('Instrument') || '<instruments>'}`,
    `  TIMEFRAME    ${find('Timeframe') || '1H'}`,
    `  INDICATORS   ${find('Indicator') || '<indicators>'}`,
    '',
    '  ON new_bar:',
    `    IF ${find('Entry rule') || '<entry condition>'}:`,
    `      size = position_size(${find('Position sizing') || '1% risk'})`,
    `      stop = entry - ${find('Stop-loss') || '1.5 x ATR'}`,
    `      target = entry + ${find('Take-profit') || '3.0 x ATR'}`,
    '      OPEN long size STOP stop LIMIT target',
    '',
    `    IF ${find('Exit rule') || '<exit condition>'}:`,
    '      CLOSE long',
    '',
    '  CONSTRAINTS:',
    `    ${find('Risk limit') || 'max open positions, daily loss cap'}`,
    `    ${find('News filter') || 'skip high-impact news windows'}`,
    `    ${find('Time filter') || 'session hours only'}`,
    '',
    '  INVALIDATION: regime flips OR risk limit breached OR manual kill switch',
  ].join('\n');
}
