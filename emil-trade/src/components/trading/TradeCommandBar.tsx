'use client';

// RAPTOR Trade Command Bar — natural-language commands for the Hedge
// Trade and Scan Trade engines. Deterministic parser (nl-commands.ts):
// the trader types plain English; the interpretation appears as VISIBLE
// structured settings which must be confirmed before anything applies.
// Unsafe commands are refused with the reason; contradictions are
// flagged and never guessed; question-like input gets a status answer.
// Every submission and application lands in the engine's audit log.

import { useState } from 'react';
import { Wand2, Check, X as XIcon, MessageCircleQuestion } from 'lucide-react';
import {
  parseTradeCommand, applyDirectives, answerQuestion, QUESTION_LIBRARY,
  type CommandScope, type ParseResult,
} from '@/lib/trading/nl-commands';

const EXAMPLES: Record<CommandScope, string> = {
  hedge: 'e.g. "Hedge any trade that loses more than $3. Use only one correlated pair. Close the basket at $2 net profit. Accept a maximum basket loss of $5."',
  scan: 'e.g. "Risk no more than 0.5 percent per trade. Stop after two consecutive losses. Lock the day at $50 profit. Only signals above 75 percent."',
};

export default function TradeCommandBar({ scope, accent, onApplied }: {
  scope: CommandScope;
  accent: string;
  onApplied: (summary: string) => void;
}) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [answer, setAnswer] = useState<string[] | null>(null);
  const [appliedNote, setAppliedNote] = useState<string[] | null>(null);

  const parse = (input?: string) => {
    const t = (input ?? text).trim();
    if (!t) return;
    setAppliedNote(null);
    const r = parseTradeCommand(t, scope);
    if (r.isQuestion) { setAnswer(answerQuestion(scope, t)); setResult(null); return; }
    setAnswer(null);
    setResult(r);
  };

  const ask = (q: string) => { setText(q); setAppliedNote(null); setResult(null); setAnswer(answerQuestion(scope, q)); };

  const confirm = () => {
    if (!result || result.directives.length === 0) return;
    const applied = applyDirectives(result.directives, scope);
    setAppliedNote(applied);
    setResult(null);
    setText('');
    onApplied(`${applied.length} rule(s) applied from your command — settings updated.`);
  };

  return (
    <div className="mt-2 rounded border p-2" style={{ borderColor: `${accent}33` }}>
      <div className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: accent }}>
        <Wand2 size={11} /> Command bar — tell the engine what you want, in plain language
      </div>
      <div className="flex gap-1.5">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') parse(); }}
          placeholder={EXAMPLES[scope]}
          className="flex-1 rounded bg-white/[0.05] px-2 py-1.5 text-[10px] text-white placeholder:text-white/25 outline-none"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
        <button onClick={() => parse()}
          className="rounded px-3 py-1.5 text-[10px] font-bold text-black transition-all hover:brightness-110"
          style={{ backgroundColor: accent }}>
          Parse
        </button>
      </div>

      {/* Question chips — click to ask; the engine answers from its real state and logs */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="text-[8px] font-bold uppercase tracking-wide text-white/30">Ask the engine:</span>
        {QUESTION_LIBRARY[scope].map((q) => (
          <button key={q} onClick={() => ask(q)}
            className="rounded px-1.5 py-0.5 text-[8px] font-semibold text-white/45 transition-all hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            {q}
          </button>
        ))}
      </div>

      {/* Question answer */}
      {answer && (
        <div className="mt-1.5 rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="mb-1 flex items-center gap-1 text-[9px] font-bold" style={{ color: accent }}>
            <MessageCircleQuestion size={11} /> Current engine status
          </div>
          {answer.map((l, i) => <p key={i} className="mb-0.5 text-[9px] leading-relaxed text-white/55">{l}</p>)}
        </div>
      )}

      {/* Parsed interpretation — trader must confirm */}
      {result && (
        <div className="mt-1.5 rounded border p-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          {result.directives.length > 0 && (
            <>
              <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-white/45">Interpreted settings — review before applying</div>
              {result.directives.map((dir, i) => (
                <p key={i} className="mb-0.5 text-[9px] leading-relaxed">
                  <span className="rounded px-1 py-0.5 font-mono text-[7px] font-bold uppercase" style={{ border: `1px solid ${accent}55`, color: accent }}>{dir.target}</span>{' '}
                  <b className="text-white/70">{dir.label}:</b> <span className="text-white/50">{dir.display}</span>
                </p>
              ))}
            </>
          )}
          {result.conflicts.map((c, i) => (
            <p key={`c${i}`} className="mb-0.5 text-[9px]" style={{ color: '#FFB300' }}>
              ⚠ Conflicting instruction detected for <b>{c.field}</b> — which rule should take priority? ({c.values.join(' vs ')}) Neither was applied.
            </p>
          ))}
          {result.refused.map((r, i) => (
            <p key={`r${i}`} className="mb-0.5 text-[9px]" style={{ color: '#FF5252' }}>
              ⛔ Refused: “{r.clause}” — {r.reason}. This instruction may create uncontrolled risk and will not be executed unless replaced with defined lot, loss, drawdown, margin and exit limits.
            </p>
          ))}
          {result.unknown.map((u, i) => (
            <p key={`u${i}`} className="mb-0.5 text-[9px] text-white/35">
              ？Not understood: “{u}” — please rephrase with a concrete number, instrument or limit. Nothing was guessed.
            </p>
          ))}
          {result.directives.length > 0 && (
            <div className="mt-1.5 flex gap-1.5">
              <button onClick={confirm}
                className="flex items-center gap-1 rounded px-3 py-1 text-[10px] font-bold text-black transition-all hover:brightness-110"
                style={{ backgroundColor: accent }}>
                <Check size={11} /> Confirm & apply {result.directives.length} rule(s)
              </button>
              <button onClick={() => setResult(null)}
                className="flex items-center gap-1 rounded px-3 py-1 text-[10px] font-bold text-white/50 transition-colors hover:text-white"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                <XIcon size={11} /> Cancel
              </button>
            </div>
          )}
          {result.directives.length === 0 && result.refused.length === 0 && result.conflicts.length === 0 && (
            <p className="text-[9px] text-white/35">Nothing recognized — safety rules always outrank strategy instructions, and missing risk settings are never invented. Try a concrete limit like “risk 0.5 percent per trade”.</p>
          )}
        </div>
      )}

      {appliedNote && (
        <div className="mt-1.5 rounded border p-2" style={{ borderColor: 'rgba(0,194,122,0.3)' }}>
          <div className="mb-0.5 text-[9px] font-bold" style={{ color: '#00C27A' }}>✓ Applied and audit-logged</div>
          {appliedNote.map((l, i) => <p key={i} className="text-[9px] text-white/50">· {l}</p>)}
        </div>
      )}
    </div>
  );
}
