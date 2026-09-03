'use client';

// Custom EA information panel (MT5-management super-prompt §16/§2/§7/§12).
// Tabs: Overview (registration metadata), Inputs (parameters extracted from the
// MQL5 source), Report (honest per-event/per-feature conversion outcome) and
// Source (read-only viewer — never shown for compiled-only files, and never
// reconstructed).

import { useRef, useState } from 'react';
import { X, FileCode2, ShieldAlert, Info, ListTree, Play, Pencil, RotateCcw, Upload, Download, Search } from 'lucide-react';
import { useTradingStore } from '@/stores/trading';
import {
  reconvertCustomEA, validateInputValue, effectiveInputValue,
  loadInputOverrides, saveInputOverrides, exportSetFile, parseSetFile,
  type CustomEA, type ConversionItem, type ExtractedInput,
} from '@/lib/trading/custom-ea';

/** Built-in library EAs open the same Properties window; they carry this
 *  marker so the modal shows honest metadata instead of a fake editor. */
export type PropertiesEA = CustomEA & { builtin?: boolean; pairs?: string[]; timeframes?: string[]; rating?: number };

type Tab = 'overview' | 'inputs' | 'report' | 'source' | 'script';

const STATUS_COLORS: Record<ConversionItem['status'], string> = {
  converted: '#00C27A',
  approximated: '#FFD700',
  'manual-review': '#FF9800',
  unsupported: '#FF5252',
};

const OVERALL_LABELS: Record<string, { text: string; color: string }> = {
  converted: { text: 'Converted', color: '#00C27A' },
  partial: { text: 'Partially converted — review notes', color: '#FFD700' },
  'compiled-only': { text: 'Compiled only — source not available', color: '#FF9800' },
  'manual-review': { text: 'Manual review required', color: '#FF9800' },
};

export default function CustomEAInfoModal({ ea: initial, onClose }: { ea: PropertiesEA; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(initial.builtin ? 'overview' : (initial.inputs?.length ? 'inputs' : 'overview'));
  // MT5-style title context: "Name (SYMBOL, TF)".
  const activeSymbol = useTradingStore((s) => s.activeSymbol);
  const activeTimeframe = useTradingStore((s) => s.activeTimeframe);
  // Editable source (mq5/pine): edits re-run the whole conversion pipeline.
  const [cur, setCur] = useState<CustomEA>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  // §5/§7 editable parameter engine: blank = EA default; overrides persist.
  const [overrides, setOverrides] = useState<Record<string, string>>(() =>
    typeof window !== 'undefined' ? loadInputOverrides(initial.id) : {});
  const [inputSearch, setInputSearch] = useState('');
  const setFileRef = useRef<HTMLInputElement>(null);

  const setOverride = (name: string, value: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === '') delete next[name]; else next[name] = value;
      saveInputOverrides(cur.id, next);
      return next;
    });
  };

  const restoreAllDefaults = () => {
    setOverrides({});
    saveInputOverrides(cur.id, {});
    setNotice('All parameters restored to the EA\'s declared defaults.');
  };

  const doExportSet = () => {
    const blob = new Blob([exportSetFile(cur, overrides)], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${cur.name.replace(/\s+/g, '_')}.set`;
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice('.set file exported with the effective parameter values.');
  };

  const doImportSet = async (file: File) => {
    const values = parseSetFile(await file.text());
    const byName = new Map((cur.inputs ?? []).map((i) => [i.name, i]));
    const next: Record<string, string> = { ...overrides };
    let applied = 0;
    const unmatched: string[] = [];
    for (const [name, value] of Object.entries(values)) {
      const inp = byName.get(name);
      if (!inp) { unmatched.push(name); continue; }
      if (validateInputValue(inp, value) === null) { next[name] = value; applied++; }
      else unmatched.push(`${name} (invalid value "${value}")`);
    }
    setOverrides(next);
    saveInputOverrides(cur.id, next);
    setNotice(`.set imported: ${applied} value(s) applied.${unmatched.length ? ` Not applied: ${unmatched.slice(0, 6).join(', ')}${unmatched.length > 6 ? '…' : ''}.` : ''}`);
  };
  const ea = cur as PropertiesEA;
  const isBuiltin = !!ea.builtin;
  const editable = !isBuiltin && ea.sourceKind !== 'ex5' && !!ea.source;
  const report = ea.report;
  const overall = report ? OVERALL_LABELS[report.overall] : null;

  const saveAndReconvert = () => {
    const updated = reconvertCustomEA(ea.id, draft);
    if (updated) {
      setCur(updated);
      setEditing(false);
      setNotice('Source saved — inputs, engine mapping, conversion report and script were regenerated.');
    } else {
      setNotice('Re-conversion failed — the EA may have been removed.');
    }
  };

  const applyScript = () => {
    if (!ea.raptorScript) return;
    try { localStorage.setItem('raptor_user_script', ea.raptorScript); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('raptor-apply-script', { detail: { code: ea.raptorScript } }));
    setNotice('Script applied — open the RAPTOR chart tab to see the plots.');
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onMouseDown={onClose}>
      <div
        className="flex max-h-[86vh] w-[640px] flex-col overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: '#0A0F1A', borderColor: 'rgba(255,255,255,0.1)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[13px] font-bold text-white">
              {ea.name}{ea.version ? ` ${ea.version}` : ''} <span className="font-normal text-white/40">({activeSymbol}, {activeTimeframe})</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/40">
              <span>{isBuiltin ? 'Built-in RAPTOR strategy' : ea.sourceKind === 'pine' ? 'Pine Script' : ea.sourceKind === 'mq5' ? 'MQL5 source' : 'Compiled .ex5'}</span>
              {overall && <span style={{ color: overall.color }}>· {overall.text}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
        </div>

        <div className="flex gap-0.5 border-b px-2 pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {((isBuiltin
            ? [['overview', 'Common', Info], ['inputs', `Inputs (${ea.inputs?.length ?? 0})`, ListTree]]
            : [['overview', 'Common', Info], ['inputs', `Inputs (${ea.inputs?.length ?? 0})`, ListTree], ['report', 'Conversion report', ShieldAlert], ['source', 'Source', FileCode2], ...(ea.raptorScript ? [['script', 'Script', Play]] : [])]
          ) as [Tab, string, typeof Info][]).map(([t, label, Icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex items-center gap-1.5 rounded-t px-3 py-1.5 text-[11px] font-medium transition-colors"
              style={{ backgroundColor: tab === t ? 'rgba(41,171,226,0.12)' : 'transparent', color: tab === t ? '#0091D5' : 'rgba(255,255,255,0.45)' }}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {notice && (
          <div className="border-b px-4 py-2 text-[10px]" style={{ borderColor: 'rgba(0,145,213,0.25)', backgroundColor: 'rgba(0,145,213,0.06)', color: '#7fc4e8' }}>
            {notice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'overview' && isBuiltin && (
            <div className="text-[11px]">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <Row k="Name" v={ea.name} />
                <Row k="Strategy type" v={ea.type ?? '—'} />
                <Row k="Engine" v={(ea.strategyKind ?? '—').replace(/_/g, ' ')} />
                <Row k="Pairs" v={(ea.pairs ?? []).join(', ') || '—'} />
                <Row k="Timeframes" v={(ea.timeframes ?? []).join(', ') || '—'} />
                <Row k="Rating" v={ea.rating != null ? `${ea.rating} / 5` : '—'} />
              </div>
              <div className="mt-3 text-[10px] leading-relaxed text-white/45">{ea.description}</div>
              <div className="mt-4 rounded-md border p-3 text-[10px] leading-relaxed text-white/50" style={{ borderColor: 'rgba(0,145,213,0.25)', backgroundColor: 'rgba(0,145,213,0.05)' }}>
                This strategy is <b className="text-white/75">built into the RAPTOR engine</b>. Its declared inputs on the
                <b className="text-white/75"> Inputs tab are live</b> — the engine reads them on every evaluation, so edits
                apply from the next signal check (and the Strategy Tester backtests the same values). Executed
                lot / SL / TP / direction remain per attached instance (⚙ on the chart chip). There is no MQL source
                to edit for built-ins — upload a <b className="text-white/75">.mq5 or .pine</b> EA for the code editor.
              </div>
            </div>
          )}

          {tab === 'overview' && !isBuiltin && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
              <Row k="Name" v={ea.name} />
              <Row k="Version" v={ea.version ?? '—'} />
              <Row k="Author" v={ea.author ?? '—'} />
              <Row k="Strategy type" v={ea.type} />
              <Row k="Mapped engine" v={ea.strategyKind.replace(/_/g, ' ')} />
              <Row k="Source language" v={ea.sourceKind === 'pine' ? 'Pine Script' : ea.sourceKind === 'mq5' ? 'MQL5' : 'Compiled binary'} />
              <Row k="Source available" v={ea.report ? (ea.report.sourceAvailable ? 'Yes' : 'No — compiled only') : ea.sourceKind === 'mq5' ? 'Yes' : 'No'} />
              <Row k="File kind" v={ea.report?.fileKind ?? (ea.sourceKind === 'mq5' ? 'ea-source' : 'compiled')} />
              <Row k="Checksum" v={ea.checksum ?? '—'} />
              <Row k="Uploaded" v={ea.uploadedAt ? new Date(ea.uploadedAt).toLocaleString() : '—'} />
              <Row k="Converted" v={ea.report ? new Date(ea.report.convertedAt).toLocaleString() : '—'} />
              <Row k="Internal ID" v={ea.id} />
              <div className="col-span-2 mt-2 text-[10px] leading-relaxed text-white/40">{ea.description}</div>
            </div>
          )}

          {tab === 'inputs' && (
            (ea.inputs?.length ?? 0) === 0 ? (
              <div className="py-6 text-center text-[11px] text-white/35">
                {isBuiltin
                  ? 'This engine variant has no tunable inputs. Executed lot / SL / TP / direction are per-instance (EA Properties on the chart).'
                  : ea.sourceKind !== 'ex5'
                  ? 'No input declarations were found in the source.'
                  : 'Compiled binary — input parameters cannot be read from an .ex5 file. Runtime execution uses the EA Properties window (lot / SL / TP / direction).'}
              </div>
            ) : (
              <div className="text-[11px]">
                {/* Toolbar: search + preset/.set controls */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="flex min-w-[160px] flex-1 items-center gap-1.5 rounded-md border px-2 py-1" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Search size={11} className="shrink-0 text-white/30" />
                    <input value={inputSearch} onChange={(e) => setInputSearch(e.target.value)} placeholder="Search parameters…"
                      className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-white/25" />
                  </div>
                  <button onClick={restoreAllDefaults} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-white/50 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                    <RotateCcw size={10} /> Restore defaults
                  </button>
                  <input ref={setFileRef} type="file" accept=".set,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void doImportSet(f); }} />
                  <button onClick={() => setFileRef.current?.click()} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-white/50 hover:text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                    <Upload size={10} /> Import .set
                  </button>
                  <button onClick={doExportSet} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: 'rgba(0,145,213,0.15)', color: '#0091D5', border: '1px solid rgba(0,145,213,0.3)' }}>
                    <Download size={10} /> Export .set
                  </button>
                </div>
                <p className="mb-3 text-[9px] leading-snug text-white/30">
                  Blank = the EA&apos;s declared default applies. {Object.keys(overrides).length} override(s) set — stored with this EA and included in .set export.
                  Web-engine execution maps the strategy onto a platform engine; use EA Properties for the executed lot/SL/TP.
                </p>
                {(() => {
                  const q = inputSearch.trim().toLowerCase();
                  const visible = (ea.inputs ?? []).filter((p) =>
                    !q || p.name.toLowerCase().includes(q) || p.label.toLowerCase().includes(q) || (p.group ?? '').toLowerCase().includes(q));
                  if (visible.length === 0) return <div className="py-4 text-center text-[10px] text-white/30">No parameters match the search.</div>;
                  const groups: { name: string; items: ExtractedInput[] }[] = [];
                  for (const p of visible) {
                    const gname = p.group ?? 'Parameters';
                    const g = groups.find((x) => x.name === gname);
                    if (g) g.items.push(p); else groups.push({ name: gname, items: [p] });
                  }
                  return groups.map((g) => (
                    <div key={g.name} className="mb-3">
                      <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-white/35">{g.name}</div>
                      {g.items.map((p) => {
                        const override = overrides[p.name] ?? '';
                        const err = validateInputValue(p, override);
                        const isBool = p.mqlType === 'bool' || p.mqlType === 'input.bool';
                        const effective = effectiveInputValue(p, overrides);
                        return (
                          <div key={p.name} className="border-t border-white/[0.04] py-1.5">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <span className="text-[11px] text-white/80">{p.label}</span>
                                <span className="ml-2 font-mono text-[9px] text-white/30">{p.name} · {p.mqlType}</span>
                              </div>
                              {isBool ? (
                                <select value={effective.toLowerCase() === 'true' ? 'true' : 'false'}
                                  onChange={(e) => setOverride(p.name, e.target.value)}
                                  className="rounded border bg-[#060D16] px-1.5 py-0.5 font-mono text-[10px] text-white outline-none"
                                  style={{ borderColor: overrides[p.name] !== undefined ? 'rgba(0,145,213,0.5)' : 'rgba(255,255,255,0.12)' }}>
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              ) : p.enumValues ? (
                                <select value={effective}
                                  onChange={(e) => setOverride(p.name, e.target.value)}
                                  className="max-w-[180px] rounded border bg-[#060D16] px-1.5 py-0.5 font-mono text-[10px] text-white outline-none"
                                  style={{ borderColor: overrides[p.name] !== undefined ? 'rgba(0,145,213,0.5)' : 'rgba(255,255,255,0.12)' }}>
                                  {!p.enumValues.includes(effective) && <option value={effective}>{effective}</option>}
                                  {p.enumValues.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                                </select>
                              ) : (
                                <input value={override} placeholder={p.defaultValue.replace(/^"|"$/g, '')}
                                  onChange={(e) => setOverride(p.name, e.target.value)}
                                  type={p.mqlType === 'color' ? 'text' : 'text'}
                                  className="w-[140px] rounded border bg-[#060D16] px-1.5 py-0.5 text-right font-mono text-[10px] text-white outline-none placeholder:text-white/25"
                                  style={{ borderColor: err ? 'rgba(255,82,82,0.6)' : overrides[p.name] !== undefined ? 'rgba(0,145,213,0.5)' : 'rgba(255,255,255,0.12)' }} />
                              )}
                              <span className="w-14 shrink-0 text-right text-[8px] uppercase" style={{ color: overrides[p.name] !== undefined ? '#0091D5' : 'rgba(255,255,255,0.25)' }}>
                                {overrides[p.name] !== undefined ? 'override' : 'default'}
                              </span>
                              <button onClick={() => setOverride(p.name, '')} disabled={overrides[p.name] === undefined}
                                title="Reset to EA default" className="shrink-0 text-white/25 hover:text-white disabled:opacity-20">
                                <RotateCcw size={10} />
                              </button>
                            </div>
                            {err && <div className="mt-0.5 text-[9px]" style={{ color: '#FF5252' }}>{err}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            )
          )}

          {tab === 'report' && (
            !report ? (
              <div className="py-6 text-center text-[11px] text-white/35">
                No conversion report — this EA was uploaded before conversion reporting existed. Re-upload the file to generate one.
              </div>
            ) : (
              <div className="text-[11px]">
                <div className="mb-3 rounded-md border p-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-white/45">Overall: </span>
                  <span className="font-bold" style={{ color: overall?.color }}>{overall?.text}</span>
                  <span className="ml-2 text-white/35">· mapped to the <b className="text-white/60">{report.detectedEngine.replace(/_/g, ' ')}</b> engine{report.engineScore > 0 ? ` (detector score ${report.engineScore})` : ' (filename default — no source to inspect)'}</span>
                </div>
                {report.securityFlags.length > 0 && (
                  <div className="mb-3 rounded-md border p-2.5" style={{ borderColor: 'rgba(255,82,82,0.35)', backgroundColor: 'rgba(255,82,82,0.06)' }}>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#FF5252' }}>Security scan</div>
                    {report.securityFlags.map((f, i) => <div key={i} className="text-[10px] text-white/60">• {f}</div>)}
                  </div>
                )}
                {[['Events', report.events], ['Trading features', report.features]].map(([title, items]) => (
                  <div key={title as string} className="mb-3">
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-white/35">{title as string}</div>
                    {(items as ConversionItem[]).length === 0 && <div className="text-[10px] text-white/25">None detected.</div>}
                    {(items as ConversionItem[]).map((it, i) => (
                      <div key={i} className="flex items-start gap-2 border-t border-white/[0.04] py-1.5">
                        <span className="w-36 shrink-0 font-mono text-white/75">{it.item}</span>
                        <span className="w-24 shrink-0 text-[9px] font-bold uppercase" style={{ color: STATUS_COLORS[it.status] }}>{it.status}</span>
                        <span className="text-[10px] leading-snug text-white/45">{it.note}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <p className="text-[9px] text-white/25">
                  Nothing is silently omitted: unsupported items above are NOT executed by the platform. The mapped engine reproduces the strategy&apos;s signal style, not the original code line-for-line.
                </p>
              </div>
            )
          )}

          {tab === 'source' && (
            !ea.source ? (
              <div className="py-6 text-center text-[11px] text-white/35">
                {ea.sourceKind === 'ex5'
                  ? 'Compiled-only file — the source code is not available and will not be reconstructed or invented. Editing is disabled.'
                  : 'Source was not stored for this EA (uploaded before source storage existed). Re-upload the file to view it.'}
              </div>
            ) : editing ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-[10px] text-white/35">
                  <span>Editing {ea.sourceKind === 'pine' ? 'Pine Script' : 'MQL5'} source — saving re-runs the full conversion</span>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="rounded bg-white/[0.06] px-2 py-1 text-[10px] text-white/60 hover:text-white">Cancel</button>
                    <button onClick={saveAndReconvert} className="rounded px-2 py-1 text-[10px] font-bold text-black" style={{ backgroundColor: '#0091D5' }}>Save &amp; Re-convert</button>
                  </div>
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  spellCheck={false}
                  className="h-[420px] w-full resize-none rounded-md border p-3 font-mono text-[10px] leading-relaxed text-white/80 outline-none"
                  style={{ borderColor: 'rgba(0,145,213,0.35)', backgroundColor: '#060D16' }}
                />
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between text-[10px] text-white/35">
                  <span>{editable ? 'Editable source' : 'Read-only viewer'} · {ea.source.split('\n').length} lines</span>
                  <div className="flex items-center gap-2">
                    {editable && (
                      <button onClick={() => { setDraft(ea.source!); setEditing(true); }}
                        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold"
                        style={{ backgroundColor: 'rgba(0,145,213,0.15)', color: '#0091D5', border: '1px solid rgba(0,145,213,0.3)' }}>
                        <Pencil size={10} /> Edit
                      </button>
                    )}
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5">{editable ? 'EDITABLE' : 'READ-ONLY'}</span>
                  </div>
                </div>
                <pre className="max-h-[420px] overflow-auto rounded-md border p-3 font-mono text-[10px] leading-relaxed text-white/70"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#060D16' }}>
                  {ea.source.split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="mr-3 w-10 shrink-0 select-none text-right text-white/20">{i + 1}</span>
                      <span className="whitespace-pre-wrap break-all">{line}</span>
                    </div>
                  ))}
                </pre>
              </div>
            )
          )}

          {tab === 'script' && ea.raptorScript && (
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] text-white/35">
                <span>Raptor Script transpiled from the Pine plots — runs on the RAPTOR chart</span>
                <button onClick={applyScript}
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-bold text-black"
                  style={{ backgroundColor: '#00C27A' }}>
                  <Play size={10} /> Apply to RAPTOR chart
                </button>
              </div>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border p-3 font-mono text-[10px] leading-relaxed text-white/75"
                style={{ borderColor: 'rgba(0,194,122,0.25)', backgroundColor: '#060D16' }}>
                {ea.raptorScript}
              </pre>
              <p className="mt-2 text-[9px] text-white/25">
                Only supported plot expressions were transpiled (SKIPPED lines list the rest). You can refine the script in the header Script editor afterwards.
              </p>
            </div>
          )}
        </div>

        {/* MT5-style bottom action bar. Overrides save as you type, so OK and
            Cancel both just close; Reset restores the EA's declared defaults. */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          {!isBuiltin && (ea.inputs?.length ?? 0) > 0 && (
            <button onClick={restoreAllDefaults}
              className="rounded px-3 py-1.5 text-[11px] text-white/55 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
              Reset
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose}
            className="rounded px-3 py-1.5 text-[11px] text-white/55 hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            Cancel
          </button>
          <button onClick={onClose}
            className="rounded px-4 py-1.5 text-[11px] font-bold text-black"
            style={{ backgroundColor: '#0091D5' }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] py-1">
      <span className="text-white/40">{k}</span>
      <span className="ml-3 truncate font-mono text-white/80" title={v}>{v}</span>
    </div>
  );
}
