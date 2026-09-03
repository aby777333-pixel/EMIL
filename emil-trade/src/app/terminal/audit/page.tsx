'use client';

// 🧾 RAPTOR Platform Audit — the living systems-audit register rendered as
// a page: module readiness scores, wiring matrix, dependency map, honest
// gap report, third-party register, LP requirement checklist, sign-off
// states. Every row reflects what was actually built, tested or found in
// the 2026-07-20 full-platform audit; gaps are named, never hidden.

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import TermsGateModal from '@/components/trading/TermsGateModal';
import {
  AUDIT_DATE, MODULE_SCORES, WIRING_MATRIX, DEPENDENCY_MAP,
  GAP_REPORT, THIRD_PARTY_REGISTER, LP_CHECKLIST, SIGN_OFF,
} from '@/lib/audit/platform-audit';

const scoreColor = (v: number) => (v >= 85 ? '#00C27A' : v >= 70 ? '#D4E157' : v >= 55 ? '#FFB300' : '#FF5252');
const sevColor: Record<string, string> = { Critical: '#FF5252', High: '#FF8A65', Medium: '#FFB300', Low: '#8B93A7' };
const stateColor: Record<string, string> = { Done: '#00C27A', Partial: '#FFB300', Pending: '#8B93A7', 'Wired & tested': '#00C27A', Wired: '#D4E157', 'Demo-grade': '#FF8A65' };

const SECTIONS = ['Modules', 'Wiring', 'Dependencies', 'Gaps', 'Third-party', 'LP checklist', 'Sign-off'] as const;

export default function PlatformAuditPage() {
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>('Modules');

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      <div className="shrink-0 border-b border-[var(--border)]">
        <TopBar />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
        <div className="mx-auto w-full max-w-[1150px]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-bold text-white">🧾 RAPTOR Platform Audit</span>
            <span className="text-[10px] text-white/40">full-platform systems audit of {AUDIT_DATE} — facts as tested; gaps named, never hidden. One ecosystem: terminal · engines · EMIL · Supabase · Netlify · JUNE portals.</span>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {SECTIONS.map((s) => (
              <button key={s} onClick={() => setTab(s)}
                className="rounded px-3 py-1.5 text-[11px] font-bold transition-all hover:brightness-125"
                style={{
                  backgroundColor: tab === s ? 'rgba(41,171,226,0.18)' : 'rgba(255,255,255,0.04)',
                  color: tab === s ? '#29ABE2' : 'rgba(255,255,255,0.45)',
                  border: `1px solid ${tab === s ? 'rgba(41,171,226,0.6)' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {s}
              </button>
            ))}
          </div>

          {tab === 'Modules' && (
            <div className="overflow-x-auto rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <table className="w-full text-left font-mono text-[10px]">
                <thead><tr className="text-white/35"><th className="pr-3 font-normal">Module</th><th className="pr-2 font-normal">Func</th><th className="pr-2 font-normal">Integ</th><th className="pr-2 font-normal">Sec</th><th className="pr-2 font-normal">Rel</th><th className="pr-3 font-normal">Readiness</th><th className="font-normal">Note</th></tr></thead>
                <tbody>
                  {MODULE_SCORES.map((m) => (
                    <tr key={m.module} className="align-top">
                      <td className="max-w-[240px] pr-3 text-white/75">{m.module}</td>
                      {[m.functionality, m.integration, m.security, m.reliability].map((v, i) => <td key={i} className="pr-2" style={{ color: scoreColor(v) }}>{v}</td>)}
                      <td className="pr-3 font-bold" style={{ color: scoreColor(m.readiness) }}>{m.readiness}</td>
                      <td className="max-w-[420px] text-white/40">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[9px] text-white/30">Scores are the auditor’s honest 0–100 assessment of the CURRENT state on simulated pricing; “performance” scoring waits for real-LP load (see Sign-off).</p>
            </div>
          )}

          {tab === 'Wiring' && (
            <div className="overflow-x-auto rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <table className="w-full text-left font-mono text-[9px]">
                <thead><tr className="text-white/35"><th className="pr-3 font-normal">Surface</th><th className="pr-3 font-normal">Via</th><th className="pr-3 font-normal">Gates</th><th className="pr-3 font-normal">Backend</th><th className="pr-3 font-normal">Storage</th><th className="font-normal">Status</th></tr></thead>
                <tbody>
                  {WIRING_MATRIX.map((w) => (
                    <tr key={w.surface} className="align-top text-white/50">
                      <td className="max-w-[190px] pr-3 text-white/75">{w.surface}</td>
                      <td className="max-w-[190px] pr-3">{w.via}</td>
                      <td className="max-w-[190px] pr-3">{w.gates}</td>
                      <td className="max-w-[180px] pr-3">{w.backend}</td>
                      <td className="max-w-[170px] pr-3">{w.storage}</td>
                      <td className="font-bold" style={{ color: stateColor[w.status] }}>{w.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[9px] text-white/30">One execution path by design: no order-placing surface bypasses Shield → Guardian → the Supabase RPCs. “Demo-grade” rows are explicitly NOT production-wired.</p>
            </div>
          )}

          {tab === 'Dependencies' && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {DEPENDENCY_MAP.map((d) => (
                <p key={d.from + d.to} className="mb-1.5 text-[10px] leading-relaxed">
                  <span className="font-bold text-white/75">{d.from}</span>
                  <span className="text-white/30"> → </span>
                  <span className="font-bold" style={{ color: '#29ABE2' }}>{d.to}</span>
                  <span className="text-white/40"> — {d.note}</span>
                </p>
              ))}
            </div>
          )}

          {tab === 'Gaps' && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(255,138,101,0.3)' }}>
              {GAP_REPORT.map((g) => (
                <div key={g.gap} className="mb-2 border-b pb-2 last:mb-0 last:border-0 last:pb-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-[10px]"><span className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold" style={{ color: sevColor[g.severity], border: `1px solid ${sevColor[g.severity]}66` }}>{g.severity}</span>{' '}<span className="text-white/70">{g.gap}</span></p>
                  <p className="text-[9px] text-white/40">↳ {g.plan}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'Third-party' && (
            <div className="overflow-x-auto rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <table className="w-full text-left font-mono text-[9px]">
                <thead><tr className="text-white/35"><th className="pr-3 font-normal">Vendor</th><th className="pr-3 font-normal">Purpose</th><th className="pr-3 font-normal">Status</th><th className="pr-3 font-normal">Failure impact</th><th className="font-normal">Backup / fallback</th></tr></thead>
                <tbody>
                  {THIRD_PARTY_REGISTER.map((t) => (
                    <tr key={t.vendor} className="align-top text-white/50">
                      <td className="max-w-[180px] pr-3 text-white/75">{t.vendor}</td>
                      <td className="max-w-[170px] pr-3">{t.purpose}</td>
                      <td className="max-w-[190px] pr-3">{t.status}</td>
                      <td className="max-w-[180px] pr-3">{t.failureImpact}</td>
                      <td className="max-w-[200px]">{t.backup}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[9px] text-white/30">No credentials appear client-side — server env only. Keys that passed through build chats are queued for rotation before launch (recipes in the operator register).</p>
            </div>
          )}

          {tab === 'LP checklist' && (
            <div className="grid gap-3 lg:grid-cols-2">
              {LP_CHECKLIST.map((g) => (
                <div key={g.group} className="rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#29ABE2' }}>{g.group}</div>
                  {g.items.map((i) => <p key={i} className="text-[10px] text-white/55">☐ {i}</p>)}
                </div>
              ))}
              <p className="text-[9px] text-white/30 lg:col-span-2">Use one copy of this checklist per candidate LP during negotiations — no symbol goes live until feed, contract spec, pricing, risk and execution mapping are ALL complete (audit rule §6).</p>
            </div>
          )}

          {tab === 'Sign-off' && (
            <div className="rounded-lg border p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {SIGN_OFF.map((s) => (
                <p key={s.check} className="mb-1.5 text-[10px]">
                  <span className="inline-block w-16 font-mono font-bold" style={{ color: stateColor[s.state] }}>{s.state}</span>
                  <span className="font-bold text-white/75">{s.check}</span>
                  <span className="text-white/40"> — {s.note}</span>
                </p>
              ))}
              <p className="mt-2 text-[9px] text-white/30">Fixed in this audit: NexusGlobal conditional-hooks crash (hooks now precede the route early-return) · Next.js 16.2.2 → 16.2.10 (middleware-bypass advisory set closed) · ws patched · 4 mechanical lint errors. The platform is complete only when every critical workflow passes end-to-end — the two Pending rows are the honest remainder.</p>
            </div>
          )}
        </div>
      </div>
      <TermsGateModal />
    </div>
  );
}
