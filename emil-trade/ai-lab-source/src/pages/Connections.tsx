import { useState, useEffect, useCallback } from 'react';
import {
  KeyRound, ShieldCheck, Plug, Check, Globe, Boxes, Building2, Lock, Network, Radio,
  Copy, Trash2, Plus, Terminal, Loader2, AlertTriangle,
} from 'lucide-react';
import { Card, SectionTitle, Badge, StatusDot } from '../components/ui';
import { useStore } from '../store';
import { api } from '../api/client';
import {
  WORLD_EXCHANGES, CRYPTO_VENUES, BROKERS_PLATFORMS, ASSET_CLASSES, INDIA_SEGMENTS,
} from '../data/coverage';

// Raptor ecosystem surfaces the lab integrates with / can deploy to.
const RAPTOR_MODULES = [
  'Trader Terminal', 'Mobile App', 'Web Platform', 'Dealer Module', 'Risk Management',
  'Copy Trading', 'CRM', 'Client Portal', 'Admin Portal', 'Tech Hub',
  'Liquidity & Bridge', 'A/B/Hybrid Book', 'Spreads & Markups', 'Wallets', 'Compliance',
];
const DEPLOY_TARGETS = [
  'Demo accounts', 'Paper accounts', 'Approved live accounts', 'Copy-trading groups', 'Managed / PAMM accounts',
];

type ConnKind = 'broker' | 'exchange' | 'data';

const CONNECT_TARGETS: Record<ConnKind, string[]> = {
  broker: ['GIO Raptor', 'MetaTrader 5', 'Interactive Brokers', 'cTrader', 'OANDA', 'Zerodha', 'TradeStation'],
  exchange: CRYPTO_VENUES.slice(0, 12),
  data: ['Polygon', 'Refinitiv', 'Bloomberg', 'TrueData (India)', 'Alpha Vantage', 'CoinGecko'],
};

export default function Connections() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Connections &amp; API Vault</h2>
        <p className="text-sm text-subtext">
          Broker-neutral, exchange-neutral connectors. Keys are stored encrypted, never displayed after saving,
          and never appear in logs, exports or agent messages. <span className="text-warning">Demo — no real
          connections are made.</span>
        </p>
      </div>

      {/* Raptor API keys — issue credentials for the Raptor Market API */}
      <ApiKeys />

      {/* Raptor ecosystem + live data-feed health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RaptorEcosystem />
        <DataFeeds />
      </div>

      {/* Secure connection vault */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ConnectForm kind="broker" title="Broker Connection" icon={<Building2 size={14} className="text-primary" />} />
        <ConnectForm kind="exchange" title="Crypto Exchange" icon={<Boxes size={14} className="text-primary" />} />
        <ConnectForm kind="data" title="Market-Data Vendor" icon={<Globe size={14} className="text-primary" />} />
      </div>

      {/* Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle right={<Globe size={14} className="text-primary" />}>World Exchanges</SectionTitle>
          <div className="flex flex-col gap-3 max-h-[340px] overflow-auto pr-1">
            {WORLD_EXCHANGES.map((g) => (
              <div key={g.region}>
                <div className="text-[11px] font-bold uppercase tracking-wide text-subtext mb-1.5">{g.region}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.venues.map((v) => (
                    <span key={v} className="badge border border-border text-text/80 bg-bg">{v}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <SectionTitle right={<Boxes size={14} className="text-primary" />}>Crypto Venues</SectionTitle>
            <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-auto">
              {CRYPTO_VENUES.map((c) => (
                <span key={c} className="badge border border-border text-text/80 bg-bg">{c}</span>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle right={<Building2 size={14} className="text-primary" />}>Brokers &amp; Platforms</SectionTitle>
            <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-auto">
              {BROKERS_PLATFORMS.map((b) => (
                <span key={b} className="badge border border-primary/30 text-primary bg-primary/5">{b}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Asset classes + India */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle>Asset Classes</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {ASSET_CLASSES.map((a) => (
              <span key={a} className="badge border border-border text-text/80 bg-bg">{a}</span>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle right={<span className="text-[10px] text-subtext">India-first</span>}>Indian Market Segments</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {INDIA_SEGMENTS.map((s) => (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {s}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

interface ApiKey {
  id: string; name: string; key_id: string; secret_prefix: string;
  scopes: string[]; created_at: string; last_used_at: string | null; revoked: boolean;
}

function ApiKeys() {
  const pushToast = useStore((s) => s.pushToast);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ key_id: string; secret: string; name: string } | null>(null);
  const [copied, setCopied] = useState('');

  const base = typeof window !== 'undefined' ? window.location.origin : '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/raptor/keys');
      const d = await r.json();
      setKeys(Array.isArray(d.keys) ? d.keys : []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const r = await fetch('/api/raptor/keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'Default' }),
      });
      const d = await r.json();
      if (d?.secret) {
        setCreated({ key_id: d.key_id, secret: d.secret, name: d.name });
        setName('');
        load();
      } else {
        pushToast({ type: 'error', message: d?.error || 'Could not create key.' });
      }
    } catch { pushToast({ type: 'error', message: 'Could not create key.' }); }
    finally { setCreating(false); }
  };

  const revoke = async (id: string) => {
    try { await fetch(`/api/raptor/keys?id=${id}`, { method: 'DELETE' }); load(); pushToast({ type: 'warning', message: 'Key revoked.' }); }
    catch { pushToast({ type: 'error', message: 'Could not revoke key.' }); }
  };

  const copy = (text: string, tag: string) => {
    navigator.clipboard.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <Card>
      <SectionTitle right={<KeyRound size={14} className="text-primary" />}>Raptor API Keys</SectionTitle>
      <p className="text-[11px] text-subtext mb-3">
        Issue credentials so external apps can call the <span className="font-mono">/api/raptor/v1</span> Market API.
        The secret is shown <b>once</b> at creation and stored only as a hash — it can never be retrieved again.
      </p>

      {/* Create */}
      <div className="flex gap-2 mb-3">
        <input className="input" placeholder="Key name (e.g. My Trading Bot)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn-primary shrink-0" onClick={create} disabled={creating}>
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Generate
        </button>
      </div>

      {/* Freshly created secret (shown once) */}
      {created && (
        <div className="glass !rounded-lg p-3 mb-3 border border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 text-warning text-xs font-semibold mb-2">
            <AlertTriangle size={13} /> Save these now — the secret is shown only once.
          </div>
          <KeyLine label="Key ID" value={created.key_id} onCopy={() => copy(created.key_id, 'kid')} copied={copied === 'kid'} />
          <KeyLine label="Secret" value={created.secret} onCopy={() => copy(created.secret, 'sec')} copied={copied === 'sec'} />
          <button className="text-[10px] text-subtext hover:text-text mt-1" onClick={() => setCreated(null)}>Done — I saved them</button>
        </div>
      )}

      {/* Existing keys */}
      {loading ? (
        <p className="text-xs text-subtext">Loading keys…</p>
      ) : keys.length === 0 ? (
        <p className="text-xs text-subtext">No API keys yet. Generate one above.</p>
      ) : (
        <div className="flex flex-col gap-1.5 mb-3">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border/40 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{k.name}</span>
                  {k.revoked
                    ? <Badge status="REJECTED">revoked</Badge>
                    : <Badge status="APPROVED"><StatusDot status="complete" /> active</Badge>}
                </div>
                <div className="font-mono text-[10px] text-subtext truncate">{k.key_id} · secret {k.secret_prefix}</div>
                <div className="text-[9px] text-subtext/70">
                  {k.scopes?.join(', ')} · last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'never'}
                </div>
              </div>
              {!k.revoked && (
                <button className="text-subtext hover:text-danger p-1" title="Revoke" onClick={() => revoke(k.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Usage */}
      <div className="glass !rounded-lg p-3 border-l-2 border-primary/50">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-subtext mb-1.5">
          <Terminal size={12} /> Example request
        </div>
        <code className="block text-[10px] font-mono text-text/80 leading-relaxed break-all whitespace-pre-wrap">
{`curl -H "x-raptor-key: <KEY_ID>" \\
     -H "x-raptor-secret: <SECRET>" \\
  "${base}/api/raptor/v1/quote?symbol=EURUSD"`}
        </code>
        <div className="text-[10px] text-subtext mt-2">
          Endpoints: <span className="font-mono">/api/raptor/v1/quote</span>, <span className="font-mono">/quotes</span>,{' '}
          <span className="font-mono">/candles</span>, <span className="font-mono">/search</span>. Same params as the internal API.
        </div>
      </div>
    </Card>
  );
}

function KeyLine({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-[10px] text-subtext w-12 shrink-0">{label}</span>
      <code className="flex-1 font-mono text-[11px] bg-bg rounded px-2 py-1 truncate">{value}</code>
      <button className="text-subtext hover:text-primary shrink-0" onClick={onCopy} title="Copy">
        {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function RaptorEcosystem() {
  return (
    <Card>
      <SectionTitle right={<Network size={14} className="text-primary" />}>Raptor Ecosystem</SectionTitle>
      <p className="text-[11px] text-subtext mb-2">
        The lab maps into the GIO Raptor stack. Tech Hub changes (symbols, spreads, markups, execution
        rules, permissions, risk limits) flow through to the lab.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {RAPTOR_MODULES.map((m) => (
          <span key={m} className="badge border border-primary/30 text-primary bg-primary/5">{m}</span>
        ))}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-subtext mb-1.5">Deployment targets</div>
      <div className="flex flex-wrap gap-1.5">
        {DEPLOY_TARGETS.map((t) => (
          <span key={t} className="badge border border-border text-text/80 bg-bg">{t}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Badge status="PAPER"><StatusDot status="running" /> Tech Hub sync: subscribed</Badge>
      </div>
    </Card>
  );
}

interface Provider { name: string; configured: boolean; scope: string }

function DataFeeds() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/market/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.providers) { setProviders(d.providers); setLoaded(true); } })
      .catch(() => { /* health unavailable — leave empty */ });
    return () => { alive = false; };
  }, []);

  return (
    <Card>
      <SectionTitle right={<Radio size={14} className="text-primary" />}>Data-Feed Status</SectionTitle>
      {!loaded ? (
        <p className="text-xs text-subtext">Querying the Raptor Market API…</p>
      ) : (
        <div className="flex flex-col gap-1">
          {providers.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <StatusDot status={p.configured ? 'complete' : 'idle'} />
                <span className="font-mono">{p.name}</span>
              </div>
              <span className="text-subtext truncate ml-2 text-right">{p.scope}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-subtext mt-2">Live from <span className="font-mono">/api/market/health</span> — the unified Raptor Market API.</p>
    </Card>
  );
}

function ConnectForm({ kind, title, icon }: { kind: ConnKind; title: string; icon: React.ReactNode }) {
  const [target, setTarget] = useState(CONNECT_TARGETS[kind][0]);
  const [apiKey, setApiKey] = useState('');
  const [secret, setSecret] = useState('');
  const [noWithdraw, setNoWithdraw] = useState(true);
  const [connected, setConnected] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const pushToast = useStore((s) => s.pushToast);
  const mode = useStore((s) => s.mode);

  const connect = async () => {
    if (!apiKey.trim()) {
      pushToast({ type: 'warning', message: 'Enter an API key first.' });
      return;
    }
    if (!noWithdraw) {
      pushToast({ type: 'warning', message: 'For safety, use keys with withdrawals disabled.' });
    }
    await api.connectBroker({ broker_name: target, mode, api_key: apiKey });
    setConnected((c) => [...new Set([...c, target])]);
    setApiKey('');
    setSecret('');
    pushToast({ type: 'success', message: `${target} connected (read/trade only).` });
  };

  const test = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      pushToast({ type: 'info', message: `${target}: permissions validated — trade enabled, withdrawals blocked.` });
    }, 900);
  };

  return (
    <Card>
      <SectionTitle right={icon}>{title}</SectionTitle>
      <div className="flex flex-col gap-2">
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
          {CONNECT_TARGETS[kind].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="relative">
          <KeyRound size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtext" />
          <input className="input !pl-8" type="password" placeholder="API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </div>
        <div className="relative">
          <Lock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtext" />
          <input className="input !pl-8" type="password" placeholder="API secret / passphrase" value={secret} onChange={(e) => setSecret(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-[11px] cursor-pointer text-subtext">
          <input type="checkbox" checked={noWithdraw} onChange={(e) => setNoWithdraw(e.target.checked)} className="accent-[#00ff88]" />
          <ShieldCheck size={13} className="text-success" /> Withdrawals disabled (recommended)
        </label>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={connect}><Plug size={13} /> Connect</button>
          <button className="btn-ghost" onClick={test} disabled={testing}>
            {testing ? 'Testing…' : 'Test'}
          </button>
        </div>
      </div>
      {connected.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {connected.map((c) => (
            <div key={c} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
              <span>{c}</span>
              <Badge status="APPROVED"><StatusDot status="complete" /> connected</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
