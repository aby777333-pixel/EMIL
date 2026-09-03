import { useState } from 'react';
import { Send, Plug, SlidersHorizontal, Bot, Check } from 'lucide-react';
import { Card, SectionTitle, Badge, StatusDot } from '../components/ui';
import { useBrokers } from '../hooks/useApi';
import { api } from '../api/client';
import { useStore } from '../store';
import { AGENTS } from '../data/agents';
import type { TradingMode } from '../types';

const BROKERS = ['MetaTrader 5', 'Alpaca', 'Interactive Brokers', 'Binance', 'OANDA', 'cTrader', 'Zerodha'];

const MODE_DESC: Record<TradingMode, string> = {
  demo: 'Sandbox with instant simulated fills. Strategies auto-approve. No real capital.',
  paper: 'Live simulated fills against real-time prices. Requires approval. No real capital.',
  live: '⚠️ Real orders to connected brokers. Every strategy requires explicit approval.',
};

export default function Settings() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const pushToast = useStore((s) => s.pushToast);
  const { data: brokers } = useBrokers();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">Settings</h2>
        <p className="text-sm text-subtext">Trading mode, broker connections, alerts, risk & agent controls.</p>
      </div>

      {/* Trading mode */}
      <Card>
        <SectionTitle>Trading Mode</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['demo', 'paper', 'live'] as TradingMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-left p-3 rounded-lg border transition-all ${
                mode === m
                  ? m === 'live'
                    ? 'border-danger/60 bg-danger/10'
                    : m === 'paper'
                      ? 'border-warning/60 bg-warning/10'
                      : 'border-primary/60 bg-primary/10 shadow-neon'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold capitalize">{m}</span>
                {mode === m && <Check size={15} className="text-primary" />}
              </div>
              <p className="text-[11px] text-subtext mt-1 leading-relaxed">{MODE_DESC[m]}</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BrokerSettings brokers={brokers || []} />
        <TelegramSettings />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskSettings />
        <AgentSettings />
      </div>
    </div>
  );
}

function BrokerSettings({ brokers }: { brokers: any[] }) {
  const [selected, setSelected] = useState(BROKERS[0]);
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState<string[]>([]);
  const pushToast = useStore((s) => s.pushToast);
  const modeVal = useStore((s) => s.mode);

  const connect = async () => {
    if (!apiKey.trim()) {
      pushToast({ type: 'warning', message: 'Enter an API key first.' });
      return;
    }
    await api.connectBroker({ broker_name: selected, mode: modeVal, api_key: apiKey });
    setConnected((c) => [...new Set([...c, selected])]);
    setApiKey('');
    pushToast({ type: 'success', message: `${selected} connected.` });
  };

  const allConnected = [...new Set([...(brokers?.map((b) => b.broker_name) || []), ...connected])];

  return (
    <Card>
      <SectionTitle right={<Plug size={14} className="text-primary" />}>Broker Connections</SectionTitle>
      <div className="flex flex-col gap-2">
        <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {BROKERS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="password"
          placeholder="API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <button className="btn-primary self-start" onClick={connect}>
          <Plug size={14} /> Connect
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {BROKERS.map((b) => {
          const isConn = allConnected.includes(b);
          return (
            <div key={b} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
              <span>{b}</span>
              {isConn ? (
                <Badge status="APPROVED">
                  <StatusDot status="complete" /> connected
                </Badge>
              ) : (
                <span className="text-subtext">not connected</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TelegramSettings() {
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const pushToast = useStore((s) => s.pushToast);

  const save = async () => {
    await api.telegramConfigure({ bot_token: token, chat_id: chatId, enabled });
    pushToast({ type: 'success', message: 'Telegram configuration saved.' });
  };
  const test = async () => {
    await api.telegramTest();
    pushToast({ type: 'info', message: 'Test message sent (check your Telegram).' });
  };

  return (
    <Card>
      <SectionTitle right={<Send size={14} className="text-primary" />}>Telegram Alerts</SectionTitle>
      <div className="flex flex-col gap-2">
        <input className="input" placeholder="Bot Token" value={token} onChange={(e) => setToken(e.target.value)} />
        <input className="input" placeholder="Chat ID" value={chatId} onChange={(e) => setChatId(e.target.value)} />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-[#00d4ff]" />
          Enable Telegram notifications
        </label>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={save}>
            <Check size={14} /> Save
          </button>
          <button className="btn-ghost" onClick={test}>
            <Send size={14} /> Test
          </button>
        </div>
      </div>
    </Card>
  );
}

function RiskSettings() {
  const [risk, setRisk] = useState(2);
  const [dailyLimit, setDailyLimit] = useState(500);
  const [atr, setAtr] = useState(1.5);

  return (
    <Card>
      <SectionTitle right={<SlidersHorizontal size={14} className="text-primary" />}>Risk Settings</SectionTitle>
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-subtext">Risk per trade</span>
            <span className="font-mono text-primary">{risk.toFixed(1)}%</span>
          </div>
          <input type="range" min={0.5} max={5} step={0.1} value={risk} onChange={(e) => setRisk(+e.target.value)} className="w-full accent-[#00d4ff]" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-subtext">Daily loss limit</span>
            <span className="font-mono text-danger">${dailyLimit}</span>
          </div>
          <input type="range" min={100} max={5000} step={50} value={dailyLimit} onChange={(e) => setDailyLimit(+e.target.value)} className="w-full accent-[#ff4444]" />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-subtext">ATR multiplier (stop)</span>
            <span className="font-mono text-warning">{atr.toFixed(1)}×</span>
          </div>
          <input type="range" min={0.5} max={5} step={0.1} value={atr} onChange={(e) => setAtr(+e.target.value)} className="w-full accent-[#ffaa00]" />
        </div>
      </div>
    </Card>
  );
}

function AgentSettings() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(AGENTS.map((a) => [a.name, true])),
  );
  const [threshold, setThreshold] = useState(60);

  return (
    <Card>
      <SectionTitle right={<Bot size={14} className="text-primary" />}>Agent Settings</SectionTitle>
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-subtext">Confidence threshold</span>
          <span className="font-mono text-primary">{threshold}%</span>
        </div>
        <input type="range" min={0} max={100} step={5} value={threshold} onChange={(e) => setThreshold(+e.target.value)} className="w-full accent-[#00d4ff]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-auto">
        {AGENTS.map((a) => (
          <label key={a.name} className="flex items-center gap-2 text-xs py-1 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled[a.name]}
              onChange={(e) => setEnabled((s) => ({ ...s, [a.name]: e.target.checked }))}
              className="accent-[#00ff88]"
            />
            <span>{a.icon}</span>
            <span className="truncate">{a.label}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}
