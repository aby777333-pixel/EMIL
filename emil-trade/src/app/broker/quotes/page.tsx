"use client";

import {
  Activity,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  MOCK DATA                                                         */
/* ------------------------------------------------------------------ */

interface FeedStatus {
  name: string;
  status: "connected" | "degraded" | "disconnected";
  symbols: number;
  latency: string;
  tickRate: string;
}

const FEEDS: FeedStatus[] = [
  { name: "TwelveData", status: "connected", symbols: 21, latency: "4.2ms", tickRate: "120 ticks/sec" },
  { name: "Internal Engine", status: "connected", symbols: 53, latency: "<1ms", tickRate: "200 ticks/sec" },
  { name: "LP Feed (LMAX)", status: "connected", symbols: 18, latency: "12ms", tickRate: "85 ticks/sec" },
];

interface QuoteQuality {
  symbol: string;
  gaps1h: number;
  avgSpread: string;
  spreadStability: number;
  latency: string;
  status: "ok" | "warning" | "critical";
}

const QUOTE_QUALITY: QuoteQuality[] = [
  { symbol: "EURUSD", gaps1h: 0, avgSpread: "0.8 pip", spreadStability: 100, latency: "3ms", status: "ok" },
  { symbol: "XAUUSD", gaps1h: 2, avgSpread: "30 pips", spreadStability: 95, latency: "5ms", status: "ok" },
  { symbol: "BTCUSD", gaps1h: 5, avgSpread: "50 pips", spreadStability: 82, latency: "8ms", status: "warning" },
  { symbol: "GBPUSD", gaps1h: 0, avgSpread: "1.1 pip", spreadStability: 98, latency: "3ms", status: "ok" },
  { symbol: "USDJPY", gaps1h: 1, avgSpread: "1.0 pip", spreadStability: 96, latency: "4ms", status: "ok" },
  { symbol: "GBPJPY", gaps1h: 3, avgSpread: "2.8 pips", spreadStability: 88, latency: "6ms", status: "warning" },
  { symbol: "USDCHF", gaps1h: 0, avgSpread: "1.2 pips", spreadStability: 99, latency: "3ms", status: "ok" },
];

interface RateGap {
  time: string;
  symbol: string;
  gapSize: string;
  duration: string;
  affectedTrades: number;
  action: string;
}

const RATE_GAPS: RateGap[] = [
  { time: "14:28:03", symbol: "BTCUSD", gapSize: "45 pips", duration: "1.2s", affectedTrades: 2, action: "Auto-rejected" },
  { time: "14:15:22", symbol: "XAUUSD", gapSize: "12 pips", duration: "0.3s", affectedTrades: 0, action: "Logged" },
  { time: "13:58:41", symbol: "GBPJPY", gapSize: "8 pips", duration: "0.5s", affectedTrades: 1, action: "Filled at prev price" },
  { time: "13:42:18", symbol: "BTCUSD", gapSize: "62 pips", duration: "2.1s", affectedTrades: 3, action: "Auto-rejected" },
  { time: "12:30:05", symbol: "EURUSD", gapSize: "3 pips", duration: "0.1s", affectedTrades: 0, action: "Logged" },
];

interface LatencyArb {
  account: string;
  trades: number;
  avgEntryTiming: string;
  winRate: string;
  estExtracted: string;
}

const LATENCY_ARBS: LatencyArb[] = [
  { account: "ACC-10078", trades: 12, avgEntryTiming: "<15ms from tick", winRate: "92%", estExtracted: "$4,280" },
  { account: "ACC-10200", trades: 5, avgEntryTiming: "<25ms from tick", winRate: "80%", estExtracted: "$1,650" },
];

/* ------------------------------------------------------------------ */
/*  HELPERS                                                           */
/* ------------------------------------------------------------------ */

function spreadBar(pct: number) {
  const filled = Math.round(pct / 8.33);
  const empty = 12 - filled;
  const color = pct >= 95 ? "text-emerald-400" : pct >= 85 ? "text-amber-400" : "text-red-400";
  return (
    <span className={`font-mono text-xs ${color}`}>
      {"\u2588".repeat(filled)}
      <span className="text-white/10">{"\u2591".repeat(empty)}</span>
      <span className="text-white/30 ml-1.5">{pct}%</span>
    </span>
  );
}

function feedStatusBadge(s: FeedStatus["status"]) {
  switch (s) {
    case "connected":
      return (
        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 blink-success" />
          Connected
        </span>
      );
    case "degraded":
      return (
        <span className="flex items-center gap-1 text-amber-400 text-[10px] font-semibold">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 blink-warning" />
          Degraded
        </span>
      );
    case "disconnected":
      return (
        <span className="flex items-center gap-1 text-red-400 text-[10px] font-semibold">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 blink-danger" />
          Disconnected
        </span>
      );
  }
}

function quoteStatusIcon(s: QuoteQuality["status"]) {
  switch (s) {
    case "ok": return <span className="text-emerald-400">&#x2705;</span>;
    case "warning": return <span className="text-amber-400">&#x26A0;&#xFE0F;</span>;
    case "critical": return <span className="text-red-400 blink-danger">&#x1F534;</span>;
  }
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                              */
/* ------------------------------------------------------------------ */

export default function QuotesPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-white p-6 space-y-8">
      {/* HEADER */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Market Data &gt; Quotes</p>
        <h1 className="text-xl font-bold tracking-tight">
          QUOTES &amp; RATES INTEGRITY
        </h1>
        <p className="text-xs text-white/40 mt-0.5">Fix the Leak Before It Drains the Book</p>
      </div>

      {/* SECTION 1: Feed Health Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEEDS.map((feed) => (
          <div key={feed.name} className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-[#0d1117] p-5">
            {feed.status === "connected" && <div className="scan-line absolute inset-0 pointer-events-none opacity-30" />}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {feed.status === "connected" ? (
                  <Wifi className="h-4 w-4 text-emerald-400" />
                ) : feed.status === "degraded" ? (
                  <Activity className="h-4 w-4 text-amber-400" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm font-semibold text-white/90">{feed.name}</span>
              </div>
              {feedStatusBadge(feed.status)}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 mb-0.5">Symbols</p>
                <p className="text-lg font-mono font-bold text-cyan-300">{feed.symbols}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 mb-0.5">Latency</p>
                <p className="text-lg font-mono font-bold text-white/70">{feed.latency}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-white/30 mb-0.5">Throughput</p>
                <p className="text-sm font-mono font-bold text-white/50">{feed.tickRate}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: Quote Quality by Symbol */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold">Quote Quality by Symbol</h2>
          <span className="ml-auto text-[10px] text-white/30 font-mono">REAL-TIME</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-right font-mono">Gaps (1h)</th>
                <th className="px-4 py-3 text-right font-mono">Avg Spread</th>
                <th className="px-4 py-3 text-left">Spread Stability</th>
                <th className="px-4 py-3 text-right font-mono">Latency</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {QUOTE_QUALITY.map((q) => (
                <tr key={q.symbol} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-cyan-300">{q.symbol}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={q.gaps1h === 0 ? "text-white/40" : q.gaps1h <= 2 ? "text-amber-300" : "text-red-400 font-bold"}>
                      {q.gaps1h}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white/60">{q.avgSpread}</td>
                  <td className="px-4 py-3">{spreadBar(q.spreadStability)}</td>
                  <td className="px-4 py-3 text-right font-mono text-white/60">{q.latency}</td>
                  <td className="px-4 py-3 text-center">{quoteStatusIcon(q.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Rate Gap Detection */}
      <div className="rounded-xl border border-white/[0.06] bg-[#0d1117] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold">Rate Gap Detection</h2>
          <span className="text-[10px] text-amber-400 ml-2">{RATE_GAPS.length} gaps detected today</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left font-mono">Time</th>
                <th className="px-4 py-3 text-left">Symbol</th>
                <th className="px-4 py-3 text-right font-mono">Gap Size</th>
                <th className="px-4 py-3 text-right font-mono">Duration</th>
                <th className="px-4 py-3 text-right font-mono">Affected Trades</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {RATE_GAPS.map((g, i) => (
                <tr key={i} className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${g.affectedTrades > 0 ? "bg-amber-500/5" : ""}`}>
                  <td className="px-4 py-3 font-mono text-white/50">{g.time}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-cyan-300">{g.symbol}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={parseFloat(g.gapSize) >= 30 ? "text-red-400 font-bold" : "text-amber-300"}>
                      {g.gapSize}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white/50">{g.duration}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={g.affectedTrades > 0 ? "text-red-400 font-bold" : "text-white/40"}>
                      {g.affectedTrades}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      g.action === "Auto-rejected"
                        ? "bg-red-500/15 text-red-300 border border-red-500/20"
                        : g.action === "Logged"
                        ? "bg-white/5 text-white/40 border border-white/10"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                    }`}>
                      {g.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: Latency Arbitrage Detection */}
      <div className="rounded-xl border border-red-500/10 bg-[#0d1117] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <Zap className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-semibold">Latency Arbitrage Detection</h2>
          <span className="text-[10px] text-red-400 ml-2 blink-danger">{LATENCY_ARBS.length} suspicious accounts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-right font-mono">Trades</th>
                <th className="px-4 py-3 text-left">Avg Entry Timing</th>
                <th className="px-4 py-3 text-right font-mono">Win Rate</th>
                <th className="px-4 py-3 text-right font-mono">Est. Extracted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {LATENCY_ARBS.map((a) => (
                <tr key={a.account} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors bg-red-500/5">
                  <td className="px-4 py-3 font-mono font-semibold text-cyan-300">{a.account}</td>
                  <td className="px-4 py-3 text-right font-mono text-white/60">{a.trades}</td>
                  <td className="px-4 py-3">
                    <span className="text-red-400 font-mono font-semibold">{a.avgEntryTiming}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className="text-red-400 font-bold">{a.winRate}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-red-400">{a.estExtracted}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button className="px-2 py-1 rounded text-[10px] font-medium border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer">
                        A-Book
                      </button>
                      <button className="px-2 py-1 rounded text-[10px] font-medium border border-red-500/40 text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer">
                        Block
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
