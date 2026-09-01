'use client'

// EMIL native trading platform — distinct from connecting an external broker.
// Availability labels are honest: what is live today vs coming soon (§172:
// never display future functionality as though it is already operational).

import { Panel } from '@/components/cockpit/panel'
import { Radio, ExternalLink, Landmark } from 'lucide-react'

const EMIL_PLATFORM_URL = 'https://dashing-hamster-0028ed.netlify.app/'

const AVAILABLE = ['Forex', 'Precious Metals', 'Indices CFDs', 'Energies CFDs', 'Crypto CFDs']
const COMING = ['Global equities', 'Country stock markets', 'ETFs', 'Futures', 'Options', 'Fixed income']

export default function EmilPlatformCard() {
  return (
    <Panel title="Trade With EMIL — two ways to execute" icon={Radio} accent="emerald">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Option A — external broker */}
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3.5">
          <p className="text-xs font-bold text-cyan-300 flex items-center gap-1.5"><Landmark className="h-4 w-4" /> OPTION A — CONNECT YOUR BROKER</p>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
            Link an existing brokerage or exchange account through the Global API Hub below. Your credentials stay server-side and
            isolated to your account; EMIL reads and analyses, and only trades when you explicitly ARM it within your limits.
          </p>
          <p className="text-[10px] text-slate-500 mt-2">Configure any provider in the Broker APIs section on this page.</p>
        </div>

        {/* Option B — EMIL native platform */}
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5"><Radio className="h-4 w-4" /> OPTION B — EMIL TRADING PLATFORM</p>
            <a
              href={EMIL_PLATFORM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 transition-colors"
            >
              CONNECT TO EMIL <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
            EMIL&apos;s own integrated trading environment — no external broker account required.
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {AVAILABLE.map((a) => (
              <span key={a} className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">{a} · LIVE</span>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {COMING.map((a) => (
              <span key={a} className="rounded px-1.5 py-0.5 text-[9px] uppercase border border-slate-600/50 bg-slate-700/30 text-slate-400">{a} · COMING SOON</span>
            ))}
          </div>
          <p className="text-[10px] text-amber-300/80 mt-2">
            Honest status: the EMIL platform currently runs on a demo/simulated price feed while the live liquidity-provider
            integration is completed — treat it as a paper environment, clearly distinct from live external-broker trading.
          </p>
        </div>
      </div>
    </Panel>
  )
}
